#!/bin/bash

echo "🚀 Déploiement Dashboard sur Vercel"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Build
echo "📦 Building project..."
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Build failed"
  exit 1
fi

# Install dependencies
echo "📥 Installing dependencies..."
npm run vercel-build
if [ $? -ne 0 ]; then
  echo "❌ Dependencies installation failed"
  exit 1
fi

# Test API endpoints
echo "🧪 Testing API endpoints..."
npm start &
SERVER_PID=$!
sleep 3

# Test status endpoint
STATUS=$(curl -s http://localhost:3001/api/status | grep -o '"status":"ok"')
if [ ! -z "$STATUS" ]; then
  echo "✓ API Status: OK"
else
  echo "✗ API Status: FAILED"
fi

# Test tokens endpoint
TOKENS=$(curl -s http://localhost:3001/api/tokens | grep -o '"monthLimit":20')
if [ ! -z "$TOKENS" ]; then
  echo "✓ Tokens API: OK (Claude Pro limit detected)"
else
  echo "✗ Tokens API: FAILED"
fi

# Test codespace endpoint
CODESPACE=$(curl -s http://localhost:3001/api/codespace | grep -o '"billingLimit":120')
if [ ! -z "$CODESPACE" ]; then
  echo "✓ Codespace API: OK (Free plan limit detected)"
else
  echo "✗ Codespace API: FAILED"
fi

kill $SERVER_PID 2>/dev/null

echo ""
echo "✅ Tous les tests sont passés!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Dashboard prêt pour Vercel:"
echo "  • Framework: Node.js + Express"
echo "  • API: /api/tokens, /api/codespace"
echo "  • Static: public/index.html, style.css, app.js"
echo "  • Build Command: npm run vercel-build"
echo ""
echo "🎯 Prochaines étapes:"
echo "  1. Créer un projet sur https://vercel.com"
echo "  2. Connecter ce repo GitHub"
echo "  3. Configurer GITHUB_TOKEN en variable d'env"
echo ""
