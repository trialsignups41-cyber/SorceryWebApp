"""
Update master_cards.json with lowest Near Mint prices from TCGPlayer export CSV.

For each unique card name, finds the minimum "TCG Low Price" across all:
- Sets (Alpha, Beta, etc.)
- Finishes (Normal, Foil)
- Only considering "Near Mint" or "Near Mint Foil" condition

Usage:
    python update_prices.py <path_to_tcgplayer_csv>
"""

import csv
import json
import sys
from pathlib import Path
from typing import Dict


def parse_pricing_csv(csv_path: str) -> Dict[str, float]:
    """
    Parse TCGPlayer pricing CSV and extract lowest Near Mint price for each card.
    
    Returns:
        Dictionary mapping card name -> lowest price
    """
    card_prices = {}  # card_name -> list of prices
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            # Extract card name (remove " (Foil)" suffix if present)
            product_name = row['Product Name']
            card_name = product_name.replace(' (Foil)', '').strip()
            
            # Only process Near Mint conditions
            condition = row['Condition']
            if condition not in ['Near Mint', 'Near Mint Foil']:
                continue
            
            # Get TCG Low Price (cheapest available)
            price_str = row['TCG Low Price'].strip()
            if not price_str:
                continue
                
            try:
                price = float(price_str)
            except ValueError:
                continue
            
            # Track all Near Mint prices for this card
            if card_name not in card_prices:
                card_prices[card_name] = []
            card_prices[card_name].append(price)
    
    # Find minimum price for each card
    min_prices = {
        card: min(prices)
        for card, prices in card_prices.items()
    }
    
    return min_prices


def update_master_cards(prices: Dict[str, float], master_cards_path: str) -> None:
    """
    Update master_cards.json with price data.
    
    Creates a backup before modifying.
    """
    # Load existing master_cards.json
    with open(master_cards_path, 'r', encoding='utf-8') as f:
        cards = json.load(f)
    
    # Create backup
    backup_path = f"{master_cards_path}.backup"
    with open(backup_path, 'w', encoding='utf-8') as f:
        json.dump(cards, f, indent=2)
    print(f"Created backup at: {backup_path}")
    
    # Update prices
    matched = 0
    unmatched = 0
    
    for card_name, card_data in cards.items():
        if card_name in prices:
            card_data['price_usd'] = round(prices[card_name], 2)
            matched += 1
        else:
            # Set price_usd to None if not found in CSV
            card_data['price_usd'] = None
            unmatched += 1
    
    # Save updated master_cards.json
    with open(master_cards_path, 'w', encoding='utf-8') as f:
        json.dump(cards, f, indent=2)
    
    print(f"\n✅ Updated {matched} cards with pricing data")
    print(f"⚠️  {unmatched} cards not found in pricing CSV")
    print(f"\nSaved to: {master_cards_path}")


def main():
    if len(sys.argv) < 2:
        print("Usage: python update_prices.py <path_to_tcgplayer_csv>")
        print("\nExample:")
        print("  python update_prices.py TCGplayer__Pricing_Custom_Export_20251210_125613.csv")
        sys.exit(1)
    
    csv_path = sys.argv[1]
    master_cards_path = "card_data/master_cards.json"
    
    # Validate files exist
    if not Path(csv_path).exists():
        print(f"❌ Error: CSV file not found: {csv_path}")
        sys.exit(1)
    
    if not Path(master_cards_path).exists():
        print(f"❌ Error: master_cards.json not found at: {master_cards_path}")
        sys.exit(1)
    
    print(f"📊 Parsing pricing data from: {csv_path}")
    prices = parse_pricing_csv(csv_path)
    print(f"Found prices for {len(prices)} unique cards")
    
    print(f"\n🔄 Updating master_cards.json...")
    update_master_cards(prices, master_cards_path)
    
    # Show some example prices
    print("\n💰 Sample prices:")
    for i, (card, price) in enumerate(sorted(prices.items())[:5]):
        print(f"  {card}: ${price:.2f}")


if __name__ == '__main__':
    main()
