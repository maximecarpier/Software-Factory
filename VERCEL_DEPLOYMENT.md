# Déploiement du Dashboard sur Vercel

## 📋 Pré-requis

- Compte Vercel (https://vercel.com)
- Token GitHub Personnel (déjà configuré)

## 🚀 Étapes de déploiement

### Option 1 : Déploiement automatique avec GitHub Actions (Recommandé)

#### 1. **Créer un projet Vercel**
   1. Allez sur https://vercel.com
   2. Connectez-vous avec GitHub
   3. Cliquez sur "Add New..." → "Project"
   4. Sélectionnez le repo `maximecarpier/Software-Factory`
   5. Configurez :
      - **Root Directory** : `dashboard`
      - **Framework** : Node.js
      - **Build Command** : `npm install`
      - **Output Directory** : laissez vide
   6. Cliquez sur "Deploy"
   7. **Note** : acceptez et copiez les valeurs affichées :
      - `VERCEL_ORG_ID`
      - `VERCEL_PROJECT_ID`

#### 2. **Configurer les secrets GitHub**
   1. Allez sur https://github.com/maximecarpier/Software-Factory/settings/secrets/actions
   2. Ajoutez les secrets suivants :
      - `VERCEL_TOKEN` : token d'accès Vercel (créer sur https://vercel.com/account/tokens)
      - `VERCEL_ORG_ID` : copié lors de la création du projet
      - `VERCEL_PROJECT_ID` : copié lors de la création du projet

#### 3. **Variables d'environnement Vercel**
   1. Sur https://vercel.com/maximecarpier/software-factory/settings/environment-variables
   2. Ajoutez :
      - `GITHUB_TOKEN` : votre token GitHub avec scopes `read:user` et `codespace`

### Option 2 : Déploiement manuel avec CLI

```bash
cd dashboard

# Installer Vercel CLI
npm install -g vercel

# Se connecter
vercel login

# Déployer en production
vercel --prod
```

## ✅ Vérification

Après le déploiement, le dashboard sera accessible sur :
```
https://[YOUR_PROJECT_NAME].vercel.app
```

- **API Tokens** : `https://[YOUR_PROJECT_NAME].vercel.app/api/tokens`
- **API Codespace** : `https://[YOUR_PROJECT_NAME].vercel.app/api/codespace`

## 📊 Fonctionnalités du Dashboard

✅ **Tokens Claude** : Consommation vs limite du plan Claude Pro ($20/mois)
✅ **GitHub Codespaces** : Heures utilisées vs limite du plan gratuit (120h/mois)
✅ **Mise à jour automatique** : Toutes les 5 minutes
✅ **Barres de progression** : Avec alerte orange si > 75%

## 🔧 Troubleshooting

### Erreur : "The specified token is not valid"
→ Régénérez votre `VERCEL_TOKEN` depuis https://vercel.com/account/tokens

### Erreur : "GITHUB_TOKEN not configured"
→ Ajoutez le token GitHub dans les variables d'environnement Vercel

### Le déploiement ne se déclenche pas
→ Vérifiez que les secrets GitHub sont correctement configurés
→ Vérifiez que le workflow `.github/workflows/vercel-deploy.yml` est bien pushé

## 📝 Notes importantes

- Le dashboard nécessite la variable `GITHUB_TOKEN` pour fonctionner
- Les données de tokens Claude proviennent de `~/.claude/projects/` sur le Codespace local
- Sur Vercel, le dashboard affichera les données du système de fichiers limité
- Pour la meilleure expérience, configurez un système de cache ou de base de données persistante

---

**Besoin d'aide ?** Consultez :
- https://vercel.com/docs
- https://github.com/BetaHuhn/deploy-to-vercel-action
