'use strict';

// ─── Constants ────────────────────────────────────────────────────────────────
const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// ─── State ────────────────────────────────────────────────────────────────────
let tokensChart    = null;
let countdownSecs  = REFRESH_INTERVAL_MS / 1000;
let countdownTimer = null;
let isRefreshing   = false;

// ─── Formatting helpers ───────────────────────────────────────────────────────
function fmt(n) {
  if (n === null || n === undefined) return '--';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function fmtCost(usd) {
  if (usd === null || usd === undefined) return '--';
  if (usd < 0.001) return '< $0.001';
  return '$' + usd.toFixed(3);
}

function fmtRelative(iso) {
  if (!iso) return 'jamais';
  const diff = Date.now() - new Date(iso).getTime();
  const min  = Math.floor(diff / 60_000);
  if (min < 1)  return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h  < 24) return `il y a ${h} h`;
  return `il y a ${Math.floor(h / 24)} j`;
}

function fmtMemGb(bytes) {
  if (!bytes) return '?';
  return Math.round(bytes / (1024 ** 3)) + ' GB';
}

function fmtHours(h) {
  if (h === null || h === undefined) return '--';
  if (h < 1) return Math.round(h * 60) + ' min';
  return Math.round(h * 10) / 10 + ' h';
}

// ─── Badge helper ─────────────────────────────────────────────────────────────
function setBadge(id, text, cls) {
  const el = document.getElementById(id);
  el.textContent = text;
  el.className   = 'badge ' + (cls || '');
}

// ─── Tokens section ───────────────────────────────────────────────────────────
function renderTokens(data) {
  if (data.error && !data.today) {
    setBadge('tokens-badge', 'erreur', 'error');
    document.getElementById('today-input').textContent  = '--';
    document.getElementById('today-output').textContent = '--';
    document.getElementById('today-cost').textContent   = data.error;
    document.getElementById('total-cost').textContent   = '--';
    document.getElementById('models-list').innerHTML    = '<div class="placeholder">' + data.error + '</div>';
    return;
  }

  setBadge('tokens-badge', 'OK', 'ok');

  const today = data.today || {};
  document.getElementById('today-input').textContent  = fmt(today.input);
  document.getElementById('today-output').textContent = fmt(today.output);
  document.getElementById('today-cost').textContent   = fmtCost(today.cost);
  document.getElementById('total-cost').textContent   = fmtCost(data.total?.cost);

  // Render monthly budget progress
  renderMonthProgress(data);

  renderChart(data.last7 || {});
  renderModels(data.models || {});
}

function renderMonthProgress(data) {
  const monthCost = data.monthCost || 0;
  const monthLimit = data.monthLimit || 20;
  const percentage = data.monthPercentage || 0;

  document.getElementById('month-progress').textContent = fmtCost(monthCost) + ' / ' + fmtCost(monthLimit);
  document.getElementById('month-progress-percent').textContent = percentage + '%';

  const fill = document.getElementById('month-progress-fill');
  fill.style.width = percentage + '%';

  // Change color if over 75% of limit
  if (percentage >= 75) {
    fill.classList.add('warning');
  } else {
    fill.classList.remove('warning');
  }
}

function renderChart(last7) {
  const labels      = Object.keys(last7).map(dateToLabel);
  const inputData   = Object.values(last7).map((d) => Math.round((d.input  || 0) / 1_000));
  const outputData  = Object.values(last7).map((d) => Math.round((d.output || 0) / 1_000));

  if (tokensChart) {
    tokensChart.data.labels           = labels;
    tokensChart.data.datasets[0].data = inputData;
    tokensChart.data.datasets[1].data = outputData;
    tokensChart.update('none'); // skip animation on update
    return;
  }

  tokensChart = new Chart(
    document.getElementById('tokensChart').getContext('2d'),
    {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label:           'Input (K tokens)',
            data:            inputData,
            backgroundColor: 'rgba(99, 102, 241, 0.65)',
            borderColor:     'rgba(99, 102, 241, 1)',
            borderWidth:     1,
            borderRadius:    4,
          },
          {
            label:           'Output (K tokens)',
            data:            outputData,
            backgroundColor: 'rgba(14, 165, 233, 0.65)',
            borderColor:     'rgba(14, 165, 233, 1)',
            borderWidth:     1,
            borderRadius:    4,
          },
        ],
      },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels:   { font: { size: 11 }, boxWidth: 10, padding: 12 },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}K`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid:  { color: 'rgba(0,0,0,0.04)' },
            ticks: { font: { size: 11 } },
          },
          x: {
            grid:  { display: false },
            ticks: { font: { size: 11 } },
          },
        },
      },
    }
  );
}

function dateToLabel(isoDate) {
  const [, m, d] = isoDate.split('-');
  return `${d}/${m}`;
}

function renderModels(models) {
  const container = document.getElementById('models-list');
  const rows = Object.entries(models)
    .sort((a, b) => b[1].cost - a[1].cost);

  if (rows.length === 0) {
    container.innerHTML = '<div class="placeholder">Aucun modèle détecté</div>';
    return;
  }

  container.innerHTML = rows.map(([name, s]) => `
    <div class="model-row">
      <span class="model-name" title="${name}">${name}</span>
      <div class="model-stats">
        <span>${fmt(s.input + s.output)}&nbsp;tok</span>
        <span>${s.requests}&nbsp;req</span>
        <span class="model-cost">${fmtCost(s.cost)}</span>
      </div>
    </div>
  `).join('');
}

// ─── Codespace section ────────────────────────────────────────────────────────
function renderCodespace(data) {
  const errorEl   = document.getElementById('codespace-error');
  const userEl    = document.getElementById('user-info');
  const billingEl = document.getElementById('billing-block');
  const billingProgressEl = document.getElementById('billing-progress-block');
  const noticeEl  = document.getElementById('no-token-notice');
  const listEl    = document.getElementById('codespaces-list');

  // Reset visibility
  [errorEl, userEl, billingEl, billingProgressEl, noticeEl].forEach((el) => el.classList.add('hidden'));

  if (!data.configured) {
    setBadge('codespace-badge', 'non configuré', '');
    noticeEl.classList.remove('hidden');
    listEl.innerHTML = '';
    return;
  }

  if (data.error) {
    setBadge('codespace-badge', 'erreur', 'error');
    errorEl.textContent = data.error;
    errorEl.classList.remove('hidden');
    listEl.innerHTML = '';
    return;
  }

  setBadge('codespace-badge', 'OK', 'ok');

  if (data.user) {
    document.getElementById('user-avatar').src         = data.user.avatar_url;
    document.getElementById('user-login').textContent  = '@' + data.user.login;
    userEl.classList.remove('hidden');
  }

  if (data.billing) {
    const b = data.billing;
    document.getElementById('billing-used').textContent  =
      b.total_paid_minutes_used != null
        ? Math.round(b.total_paid_minutes_used / 60) + ' h'
        : '--';
    document.getElementById('billing-quota').textContent =
      b.included_minutes != null
        ? Math.round(b.included_minutes / 60) + ' h'
        : '--';
    billingEl.classList.remove('hidden');

    // Render billing progress bar
    renderBillingProgress(data);
    billingProgressEl.classList.remove('hidden');
  }

  const spaces = data.codespaces || [];
  if (spaces.length === 0) {
    listEl.innerHTML = '<div class="placeholder">Aucun codespace trouvé</div>';
    return;
  }

  listEl.innerHTML = spaces.map(renderCodespaceCard).join('');
}

function renderBillingProgress(data) {
  const usedHours = data.billingUsedHours || 0;
  const limitHours = data.billingLimit || 120;
  const percentage = data.billingPercentage || 0;

  document.getElementById('billing-progress').textContent = fmtHours(usedHours) + ' / ' + fmtHours(limitHours);
  document.getElementById('billing-progress-percent').textContent = percentage + '%';

  const fill = document.getElementById('billing-progress-fill');
  fill.style.width = percentage + '%';

  // Change color if over 75% of limit
  if (percentage >= 75) {
    fill.classList.add('warning');
  } else {
    fill.classList.remove('warning');
  }
}

function renderCodespaceCard(cs) {
  const state     = cs.state || 'Unknown';
  const stateLow  = state.toLowerCase();
  const machine   = cs.machine
    ? `${cs.machine.display_name} · ${cs.machine.cpus}&nbsp;CPU · ${fmtMemGb(cs.machine.memory_in_bytes)}`
    : 'Machine inconnue';

  return `
    <div class="codespace-card" data-state="${state}">
      <div class="codespace-name">
        ${escHtml(cs.display_name || cs.name)}
        <span class="state-pill ${stateLow}">${state}</span>
      </div>
      <div class="codespace-meta">
        ${cs.repository ? `<span>${escHtml(cs.repository)}</span>` : ''}
        <span>${machine}</span>
        <span>Utilisé ${fmtRelative(cs.last_used_at)}</span>
      </div>
    </div>
  `;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Refresh logic ────────────────────────────────────────────────────────────
async function refreshAll() {
  if (isRefreshing) return;
  isRefreshing = true;

  const btn = document.getElementById('refresh-btn');
  btn.disabled = true;
  btn.textContent = 'Chargement...';
  setBadge('tokens-badge',    'chargement', 'loading');
  setBadge('codespace-badge', 'chargement', 'loading');

  resetCountdown();

  try {
    const [tokensData, codespaceData] = await Promise.all([
      fetch('/api/tokens').then(parseJson),
      fetch('/api/codespace').then(parseJson),
    ]);

    renderTokens(tokensData);
    renderCodespace(codespaceData);

    document.getElementById('last-updated').textContent =
      'Mis à jour à ' + new Date().toLocaleTimeString('fr-FR');
  } catch (err) {
    console.error('Refresh failed:', err);
    setBadge('tokens-badge',    'erreur réseau', 'error');
    setBadge('codespace-badge', 'erreur réseau', 'error');
  } finally {
    isRefreshing    = false;
    btn.disabled    = false;
    btn.textContent = 'Actualiser';
  }
}

async function parseJson(res) {
  const text = await res.text();
  try { return JSON.parse(text); }
  catch { return { error: `Réponse invalide (HTTP ${res.status})` }; }
}

function resetCountdown() {
  clearInterval(countdownTimer);
  countdownSecs = REFRESH_INTERVAL_MS / 1000;
  startCountdown();
}

function startCountdown() {
  countdownTimer = setInterval(() => {
    countdownSecs -= 1;
    if (countdownSecs <= 0) {
      clearInterval(countdownTimer);
      refreshAll();
      return;
    }
    const m = Math.floor(countdownSecs / 60);
    const s = String(countdownSecs % 60).padStart(2, '0');
    document.getElementById('countdown').textContent = `${m}:${s}`;
  }, 1_000);
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
refreshAll();
