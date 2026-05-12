#!/usr/bin/env bash
# ============================================================
# WhatsApp AI Bot — One-shot local setup script
# Usage: bash setup/setup.sh
# ============================================================
set -e

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  WhatsApp AI Business Bot — Local Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check prerequisites
command -v node >/dev/null 2>&1  || { echo "ERROR: Node.js not found. Install from https://nodejs.org"; exit 1; }
command -v pnpm >/dev/null 2>&1  || { echo "ERROR: pnpm not found. Run: npm install -g pnpm"; exit 1; }
command -v psql >/dev/null 2>&1  || { echo "ERROR: psql not found. Install PostgreSQL from https://www.postgresql.org"; exit 1; }

# Load .env if it exists
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Ask for DATABASE_URL if not set
if [ -z "$DATABASE_URL" ]; then
  echo "Enter your PostgreSQL connection string."
  echo "Example: postgresql://postgres:password@localhost:5432/whatsapp_bot"
  read -p "DATABASE_URL: " DATABASE_URL
  echo "DATABASE_URL=$DATABASE_URL" >> .env
fi

echo ""
echo "→ Installing dependencies..."
pnpm install

echo ""
echo "→ Applying database schema..."
psql "$DATABASE_URL" -f setup/schema.sql

echo ""
read -p "→ Load sample salon data? (y/N): " LOAD_SAMPLE
if [[ "$LOAD_SAMPLE" =~ ^[Yy]$ ]]; then
  psql "$DATABASE_URL" -f setup/sample-data.sql
  echo "   Sample data loaded."
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Setup complete!"
echo ""
echo "  Start the API server (terminal 1):"
echo "    pnpm --filter @workspace/api-server run dev"
echo ""
echo "  Start the dashboard (terminal 2):"
echo "    pnpm --filter @workspace/admin-dashboard run dev"
echo ""
echo "  Dashboard: http://localhost:5173"
echo "  API:       http://localhost:8080"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
