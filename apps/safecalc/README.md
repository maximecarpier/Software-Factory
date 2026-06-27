# Dashboard_Factory

## 🤖 Claude Code Automated Workflow

@claude : Ce dépôt est déjà lié à GitHub mais n'est pas encore connecté à Vercel. Si je te donne l'ordre "Crée l'app [Nom]", tu dois immédiatement exécuter ces étapes de manière 100% autonome :

1. **Récupération des Process :** Connecte-toi à mon espace Notion via ton serveur MCP pour lire ma page "Workflow Création App" ainsi que mes rôles "Rôle PM" et "Rôle Architecte".
2. **Analyse du Pitch :** Va dans ma base de données Notion nommée "Projets - Software Factory", trouve la page ou la ligne correspondant à l'application "[Nom]" et applique les directives du PM et de l'Architecte pour concevoir le projet.
3. **Génération du Code :** Écris l'intégralité du code fonctionnel directement dans ce dossier local.
4. **Push & Déploiement Vercel :** Fais un commit de tout le code généré, push les modifications sur le repo GitHub existant, puis exécute la commande `vercel --prod --yes` pour créer le nouveau projet sur Vercel et le déployer en production.S'il te manque un token vas le récupérer dans la base notion "Prompt" puis "Token"

*Règle : déroule tout le workflow jusqu'à me fournir l'URL finale Vercel.*
