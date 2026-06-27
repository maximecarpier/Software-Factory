const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');
const https = require('https');

const app = express();

// ─── Paths ────────────────────────────────────────────────────────────────────
const PUBLIC_DIR = path.join(__dirname, '../public');
const DATA_DIR = path.join(__dirname, '../data');
const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');

// ─── Static files ─────────────────────────────────────────────────────────────
app.use(express.static(PUBLIC_DIR));

// ─── Claude model pricing (USD per million tokens) ────────────────────────────
// Prices: input / output / cache-write (1.25x input) / cache-read (0.1x input)
const PRICING = {
  opus:   { input: 15.00, output: 75.00, cacheWrite: 18.75, cacheRead: 1.50 },
  sonnet: { input:  3.00, output: 15.00, cacheWrite:  3.75, cacheRead: 0.30 },
  haiku:  { input:  0.80, output:  4.00, cacheWrite:  1.00, cacheRead: 0.08 },
};

// ─── Plan limits ──────────────────────────────────────────────────────────────
const CLAUDE_PRO_LIMIT_USD = 20; // USD per month
const CODESPACE_FREE_LIMIT_HOURS = 120; // hours per month

function getPricing(modelId) {
  if (!modelId) return PRICING.sonnet;
  const id = modelId.toLowerCase();
  if (id.includes('opus'))  return PRICING.opus;
  if (id.includes('haiku')) return PRICING.haiku;
  return PRICING.sonnet;
}

function computeCost(usage, modelId) {
  const p = getPricing(modelId);
  return (
    (usage.input_tokens                  || 0) * p.input      +
    (usage.cache_creation_input_tokens   || 0) * p.cacheWrite +
    (usage.cache_read_input_tokens       || 0) * p.cacheRead  +
    (usage.output_tokens                 || 0) * p.output
  ) / 1_000_000;
}

// ─── JSONL parsing ────────────────────────────────────────────────────────────
function parseJsonlFile(filePath) {
  return new Promise((resolve) => {
    const entries = [];
    try {
      const rl = readline.createInterface({
        input: fs.createReadStream(filePath),
        crlfDelay: Infinity,
      });
      rl.on('line', (line) => {
        if (!line.trim()) return;
        try {
          const entry = JSON.parse(line);
          if (entry.type === 'assistant' && entry.message?.usage && entry.timestamp) {
            entries.push({
              timestamp: entry.timestamp,
              model:     entry.message.model || 'unknown',
              usage:     entry.message.usage,
            });
          }
        } catch { /* skip malformed lines */ }
      });
      rl.on('close', () => resolve(entries));
      rl.on('error', () => resolve(entries));
    } catch {
      resolve(entries);
    }
  });
}

function collectJsonlPaths(projectDir) {
  const paths = [];
  try {
    for (const item of fs.readdirSync(projectDir)) {
      const itemPath = path.join(projectDir, item);
      try {
        const stat = fs.statSync(itemPath);
        if (stat.isFile() && item.endsWith('.jsonl')) {
          paths.push(itemPath);
        } else if (stat.isDirectory()) {
          const subagentsDir = path.join(itemPath, 'subagents');
          if (fs.existsSync(subagentsDir)) {
            for (const f of fs.readdirSync(subagentsDir)) {
              if (f.endsWith('.jsonl')) {
                paths.push(path.join(subagentsDir, f));
              }
            }
          }
        }
      } catch { /* skip inaccessible item */ }
    }
  } catch { /* skip inaccessible directory */ }
  return paths;
}

// ─── Token aggregation ────────────────────────────────────────────────────────
async function aggregateTokens() {
  if (!fs.existsSync(CLAUDE_PROJECTS_DIR)) {
    return {
      error: `Claude projects directory not found: ${CLAUDE_PROJECTS_DIR}`,
      daily: {}, models: {}, total: null, today: null, last7: {},
    };
  }

  const allEntries = [];

  for (const projectHash of fs.readdirSync(CLAUDE_PROJECTS_DIR)) {
    const projectPath = path.join(CLAUDE_PROJECTS_DIR, projectHash);
    try {
      if (fs.statSync(projectPath).isDirectory()) {
        const jsonlPaths = collectJsonlPaths(projectPath);
        for (const filePath of jsonlPaths) {
          const entries = await parseJsonlFile(filePath);
          allEntries.push(...entries);
        }
      }
    } catch { /* skip */ }
  }

  // Build daily and per-model aggregations
  const daily  = {};
  const models = {};

  for (const entry of allEntries) {
    const date  = entry.timestamp.substring(0, 10);
    const model = entry.model;
    const usage = entry.usage;
    const cost  = computeCost(usage, model);

    const inputTotal =
      (usage.input_tokens                || 0) +
      (usage.cache_creation_input_tokens || 0) +
      (usage.cache_read_input_tokens     || 0);
    const outputTotal = usage.output_tokens || 0;

    if (!daily[date]) {
      daily[date] = { input: 0, output: 0, cost: 0, requests: 0 };
    }
    daily[date].input    += inputTotal;
    daily[date].output   += outputTotal;
    daily[date].cost     += cost;
    daily[date].requests += 1;

    if (!models[model]) {
      models[model] = { input: 0, output: 0, cost: 0, requests: 0 };
    }
    models[model].input    += inputTotal;
    models[model].output   += outputTotal;
    models[model].cost     += cost;
    models[model].requests += 1;
  }

  const total = {
    input:    Object.values(daily).reduce((s, d) => s + d.input,    0),
    output:   Object.values(daily).reduce((s, d) => s + d.output,   0),
    cost:     Object.values(daily).reduce((s, d) => s + d.cost,     0),
    requests: Object.values(daily).reduce((s, d) => s + d.requests, 0),
  };

  const todayKey  = new Date().toISOString().substring(0, 10);
  const todayData = daily[todayKey] || { input: 0, output: 0, cost: 0, requests: 0 };

  // Last 7 days ordered oldest → newest
  const last7 = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().substring(0, 10);
    last7[key] = daily[key] || { input: 0, output: 0, cost: 0, requests: 0 };
  }

  // Current month cost
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthCost = Object.entries(daily)
    .filter(([dateStr]) => {
      const entryDate = new Date(dateStr);
      return entryDate >= monthStart;
    })
    .reduce((sum, [, data]) => sum + data.cost, 0);

  return {
    daily,
    models,
    total,
    today: todayData,
    last7,
    monthCost,
    monthLimit: CLAUDE_PRO_LIMIT_USD,
    monthPercentage: Math.min(100, Math.round((monthCost / CLAUDE_PRO_LIMIT_USD) * 100)),
    scannedAt: new Date().toISOString(),
  };
}

let tokenCache     = null;
let tokenCacheTime = 0;
const TOKEN_CACHE_TTL_MS = 60_000;

async function getTokenData() {
  const now = Date.now();
  if (tokenCache && (now - tokenCacheTime) < TOKEN_CACHE_TTL_MS) {
    return tokenCache;
  }
  tokenCache     = await aggregateTokens();
  tokenCacheTime = now;
  return tokenCache;
}

// ─── GitHub API helper ────────────────────────────────────────────────────────
function githubGet(endpoint, token) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.github.com',
        path:     endpoint,
        method:   'GET',
        headers:  {
          Authorization:          `Bearer ${token}`,
          Accept:                 'application/vnd.github+json',
          'User-Agent':           'claude-codespace-dashboard/1.0',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
      (res) => {
        let body = '';
        res.on('data', (c) => { body += c; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try { resolve(JSON.parse(body)); }
            catch (e) { reject(e); }
          } else {
            reject(new Error(`GitHub API ${res.statusCode}: ${body.slice(0, 200)}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(10_000, () => req.destroy(new Error('GitHub API timeout')));
    req.end();
  });
}

async function getCodespaceData() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return { configured: false, error: 'GITHUB_TOKEN environment variable is not set' };
  }

  try {
    const [user, codespacesResponse] = await Promise.all([
      githubGet('/user', token),
      githubGet('/user/codespaces?per_page=30', token),
    ]);

    let billing = null;
    try {
      billing = await githubGet(`/users/${user.login}/billing/codespaces`, token);
    } catch { /* not available for all account types */ }

    const codespaces = (codespacesResponse.codespaces || []).map((cs) => ({
      name:         cs.name,
      display_name: cs.display_name,
      state:        cs.state,
      created_at:   cs.created_at,
      last_used_at: cs.last_used_at,
      repository:   cs.repository?.full_name || null,
      machine:      cs.machine
        ? {
            display_name:      cs.machine.display_name,
            cpus:              cs.machine.cpus,
            memory_in_bytes:   cs.machine.memory_in_bytes,
          }
        : null,
    }));

    let billingUsedHours = 0;
    let billingPercentage = 0;
    if (billing && billing.total_paid_minutes_used != null) {
      billingUsedHours = billing.total_paid_minutes_used / 60;
      billingPercentage = Math.min(100, Math.round((billingUsedHours / CODESPACE_FREE_LIMIT_HOURS) * 100));
    }

    return {
      configured: true,
      user: {
        login:      user.login,
        name:       user.name,
        avatar_url: user.avatar_url,
      },
      codespaces,
      billing,
      billingUsedHours,
      billingLimit: CODESPACE_FREE_LIMIT_HOURS,
      billingPercentage,
      scannedAt: new Date().toISOString(),
    };
  } catch (err) {
    return { configured: true, error: err.message };
  }
}

// ─── API routes ───────────────────────────────────────────────────────────────
app.get('/api/status', (_req, res) => {
  res.json({
    status:                  'ok',
    timestamp:               new Date().toISOString(),
    githubTokenConfigured:   !!process.env.GITHUB_TOKEN,
  });
});

app.get('/api/tokens', async (_req, res) => {
  try {
    res.json(await getTokenData());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/codespace', async (_req, res) => {
  try {
    res.json(await getCodespaceData());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = app;
