# Audit de migration — [NOM_APP]

> V0 — Créé le YYYY-MM-DD
> Living document — mis à jour à chaque version
> Source de vérité sur la dette technique et les gaps Factory

## Historique des audits

| Version | Date | Résumé |
|---|---|---|
| V0 | YYYY-MM-DD | Migration initiale — N bloquants, M dette, P gaps |

---

## 🔴 Bloquants prod

> À corriger AVANT le premier deploy.

| # | Fichier:ligne | Problème | Risque | Correction | Statut |
|---|---|---|---|---|---|
| B1 | — | — | — | — | OUVERT |

---

## 🟡 Dette technique

> À planifier en V1 ou V2. Ne bloque pas le deploy V0.

| # | Fichier | Problème | Priorité | Statut |
|---|---|---|---|---|
| D1 | — | Tests absents — couverture 0% | Haute | OUVERT |

---

## 🟢 Factory gaps

> Standards Factory manquants. Non bloquants mais à combler progressivement.

| # | Élément manquant | Action | Statut |
|---|---|---|---|
| G1 | README.md | doc-writer finalize | OUVERT |
| G2 | docs/CLAUDE.md | doc-writer finalize | OUVERT |

---

## ✅ Conservé — OK

> Tout ce qui fonctionne et sera gardé tel quel. Périmètre de la migration partielle.

- **Stack** : [ex: React 18, Vite, localStorage]
- **Build** : `npm run build` → OK
- **Sécurité** : `npm audit` → 0 CVE critique
- **Fonctionnalités** : [liste des features qui marchent]
- **Config** : [fichiers de config corrects]

---

## Notes

*(Observations qualitatives non catégorisables — patterns notables, choix d'architecture, etc.)*
