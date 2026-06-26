---
name: project-dashboard-architecture
description: Architecture validée pour le dashboard monitoring tokens Claude + Codespace GitHub - décisions clés et caveats identifiés
metadata:
  type: project
---

Dashboard personnel de monitoring de ressources pour Claude Code sur GitHub Codespace.

**Décisions architecturales validées:**
- Stack: HTML/CSS/JS vanilla + Chart.js CDN + Node.js/Express proxy local
- Persistance: Fichier JSON plat (suffisant pour 30-90 jours de données, ~2-5 MB)
- Refresh: Polling toutes les 5 minutes (WebSocket inutile pour cet intervalle)
- Déploiement: Local dans Codespace uniquement, usage mono-utilisateur

**Why:** Projet personnel léger, aucune interactivité requise v1, éviter l'over-engineering.

**Caveat majeur identifié - Source des tokens Claude:**
L'interception proxy ne capte PAS les appels directs de Claude Code à api.anthropic.com. Claude Code appelle l'API directement depuis son processus. La source de données correcte est la lecture des fichiers JSONL dans `~/.claude/projects/<hash>/*.jsonl` qui contiennent les métadonnées usage (input_tokens, output_tokens) de chaque échange.

**Caveat sécurité Codespace:**
Port 3001 Express peut être exposé publiquement dans Codespace si non configuré. Préférer les Codespace Secrets (Settings > Codespaces > Secrets) au fichier .env local - ils persistent entre reconstructions et ne risquent pas d'être commités.

**How to apply:** Lors de l'implémentation, orienter vers la lecture des logs locaux Claude Code pour les tokens, et vers les Codespace Secrets pour les clés API. Servir le frontend depuis Express (port unique, pas de CORS).

[[project-dashboard-ressources]]
