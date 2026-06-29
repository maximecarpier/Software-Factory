## Changelog
| Version | Date | Changements |
|---|---|---|
| v1.0 | 2024-11 | MVP initial — F1 à F9 |

---

# Cahier des charges fonctionnel — TravelFinance

## Contexte

Application web de suivi des dépenses pour voyageurs longue durée multi-pays. Saisie rapide sur smartphone en mobilité, synchronisation cloud, statistiques par pays et par catégorie.

**Utilisateurs** : voyageurs en backpacking ou road-trip, saisie quotidienne sur mobile (iOS Safari prioritaire).

---

## MVP — Fonctionnalités v1.0

### F1 — Gestion des pays
- Ajouter / modifier / supprimer un pays
- Chaque pays : nom, devise (30 devises prises en charge), visa (€), emoji drapeau
- Vue dédiée onglet "Pays" avec résumé (nb jours, total €)

### F2 — Journal des journées
- Ajouter / modifier / supprimer une journée
- Chaque journée : pays, date, ville, durée (nb jours), notes (optionnel)
- 6 catégories de dépenses : Trajet Aller, Déplacements, Nourriture, Activités, Logement, Soirées & kiff
- Saisie en devise locale (conversion € en temps réel)
- Prévisualisation du total journée (€) pendant la saisie

### F3 — Conversion de devises
- Taux de change chargés depuis `open.er-api.com` (base EUR)
- Fallback intégré : THB=38, USD=1.08, VND=27000, LAK=23000
- Affichage du taux dans le formulaire de journée (ex: "1€ = 38 THB")

### F4 — Logique visa
- Le visa est imputé au premier jour d'entrée dans chaque pays
- Si retour dans un pays déjà visité → nouveau visa comptabilisé
- Affiché dans le total du stop et dans les stats

### F5 — Journal view (onglet principal)
- Journées regroupées par stops (pays + ville consécutifs identiques)
- Stops affichés du plus récent au plus ancien
- Header : total global (€), durée totale, nb pays
- Badges catégories colorés par journée

### F6 — Statistiques (onglet Stats)
- Donut chart (Chart.js) répartition des dépenses par catégorie
- Filtre par pays sur le graphique
- Tableau récapitulatif par pays : total €, durée, €/jour, % du budget

### F7 — Synchronisation cloud
- Sauvegarde automatique dans Upstash KV (Redis) après chaque modification
- Debounce 800ms pour éviter les sauvegardes trop fréquentes
- Indicateur de statut dans le header (Synchro en cours / Synchronisé / Erreur)
- Chargement au démarrage depuis le KV

### F8 — Export / Import JSON
- Export : téléchargement `journal-voyage-YYYY-MM-DD.json`
- Import : chargement d'un fichier JSON, remplacement complet des données
- Accessible via le tiroir Paramètres (⚙️)

### F9 — UX mobile-first (iOS Safari)
- Bottom tab bar : Journal / Stats / Pays
- Modals bottom sheet (border-radius en haut, scroll interne)
- Touch targets min 44px sur tous les boutons
- `font-size: 16px` sur les inputs (prévient le zoom iOS)
- `safe-area-inset` pour l'encoche et la Dynamic Island
- Toast notifications (2.5s)

---

## V2+ — Fonctionnalités futures

- **Budgets par pays** : plafond quotidien avec alerte visuelle si dépassé
- **Timeline interactive** : vue calendrier/carte
- **Partage** : export URL ou PDF formaté
- **Multi-voyage** : plusieurs voyages distincts dans la même app
