---
name: project-dashboard
description: Claude token + GitHub Codespace monitoring dashboard built in dashboard/ subdirectory
metadata:
  type: project
---

A monitoring dashboard was implemented at `/workspaces/Software-Factory/dashboard/`.

**Why:** User wanted visibility into Claude API token spend and Codespace billing in a single local UI.

**Stack:** Node.js/Express (port 3001) serving vanilla HTML/CSS/JS + Chart.js CDN. No build step.

**Key implementation decisions:**
- Token data is read directly from `~/.claude/projects/{hash}/*.jsonl` (and `{hash}/{uuid}/subagents/agent-*.jsonl`) — no API interception
- Each `"type": "assistant"` JSONL entry has `message.usage` with input/output token counts
- Server-side 60s in-memory cache on `/api/tokens` to avoid re-scanning JSONL on every request
- Cache pricing: input_tokens × full price, cache_creation_input_tokens × 1.25×, cache_read_input_tokens × 0.1×
- GITHUB_TOKEN must be set via Codespace Secrets (never .env) — port 3001 must stay Private
- GitHub billing endpoint (`/users/{login}/billing/codespaces`) fails gracefully for accounts where it's unavailable

**How to apply:** If user asks to extend the dashboard (new metrics, new endpoint), read `server.js` and `public/app.js` first. The pattern is: add a route in server.js → add a render function in app.js → call it from `refreshAll()`.
