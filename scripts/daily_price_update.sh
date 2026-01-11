#!/bin/bash

# Daily Price Update Script for Sorcery Card Data
# Fetches latest prices from tcgcsv.com API and updates master_cards.json
# Designed to run via crontab at 5 AM daily

# Exit on error
set -e

# Change to the project directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

# Log start time
echo "=== Price Update Started at $(date) ==="

# Run the Python update script (it fetches prices directly from API)
echo "Fetching prices from tcgcsv.com and updating master_cards.json..."
python3 scripts/update_prices.py

# Check if there are any changes to commit
if git diff --quiet card_data/master_cards.json; then
    echo "No price changes detected. Skipping commit."
    echo "=== Price Update Completed at $(date) - No Changes ==="
    exit 0
fi

# Stage and commit changes
echo "Committing price updates..."
git add card_data/master_cards.json
git commit -m "Automated price update - $(date +'%Y-%m-%d')"

# Push to GitHub (triggers Vercel deployment)
echo "Pushing to GitHub..."
git push origin main

echo "=== Price Update Completed Successfully at $(date) ==="

