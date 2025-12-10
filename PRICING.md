# Pricing Data Update Guide

## Overview
Card prices are stored in `card_data/master_cards.json` and displayed throughout the app. Prices are sourced from TCGPlayer export CSVs.

## How to Update Prices

### 1. Export New Pricing Data from TCGPlayer
- Go to TCGPlayer and export your custom pricing report
- Save the CSV file

### 2. Run the Update Script
```bash
python3 update_prices.py path/to/your/pricing_export.csv
```

Example:
```bash
python3 update_prices.py card_data/prices.csv
```

### 3. The Script Will:
- Parse the CSV for "Near Mint" and "Near Mint Foil" prices
- Find the lowest price for each unique card across all sets and finishes
- Create a backup of `master_cards.json` (as `master_cards.json.backup`)
- Update each card with its lowest price

### 4. Review Changes
- Check the console output for matched vs unmatched cards
- Review a few sample prices to ensure they look correct

### 5. Commit and Deploy
```bash
git add card_data/master_cards.json card_data/prices.csv
git commit -m "Update card prices from TCGPlayer export"
git push
```

Vercel will automatically deploy the updated prices!

## Price Display in App

Prices are shown:
- **On each card** - Green badge in bottom-right corner
- **In bucket headers** - Total value of all cards in that bucket
- **At the top** - Total deck value across all buckets

## File Structure

```
card_data/
├── master_cards.json       # Main card database with prices
├── prices.csv              # Latest TCGPlayer pricing export (optional to commit)
└── master_cards.json.backup # Auto-created backup (not committed)
```

## Pricing Logic

For each card, the script:
1. Finds all listings in the CSV matching the card name
2. Filters to only "Near Mint" or "Near Mint Foil" condition
3. Takes the minimum "TCG Low Price" across all sets/finishes
4. Stores as a single `price` field in master_cards.json

This gives users the **cheapest way to acquire each card** regardless of set or finish.

## Notes

- Cards not found in the pricing CSV will have `price: null`
- The backup file is automatically created before each update
- Prices are in USD
- The CSV can be committed to the repo or downloaded fresh each time
