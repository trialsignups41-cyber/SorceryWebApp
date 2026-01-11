"""
Update master_cards.json with lowest prices from tcgcsv.com JSON data.

Fetches pricing data from tcgcsv.com API for Sorcery: Contested Realm (category 77)
and updates master_cards.json with the lowest available price for each card.

Usage:
    python update_prices.py
"""

import json
import sys
import requests
import unicodedata
from pathlib import Path
from typing import Dict


def normalize_card_name(name: str) -> str:
    """
    Normalize card name for matching by:
    - Converting to lowercase
    - Normalizing unicode characters (e.g., é -> e, ö -> o)
    - Removing punctuation and special characters
    - Removing extra whitespace
    """
    # Normalize unicode (NFD = decompose, then filter out combining marks)
    normalized = unicodedata.normalize('NFD', name)
    # Keep only ASCII letters, numbers, and spaces
    ascii_only = ''.join(c for c in normalized if unicodedata.category(c) != 'Mn')
    # Convert to lowercase and collapse whitespace
    return ' '.join(ascii_only.lower().split())


def create_price_lookup(prices: Dict[str, float]) -> Dict[str, tuple]:
    """
    Create a lookup dict with both exact and normalized names.
    Returns dict: normalized_name -> (original_name, price)
    """
    lookup = {}
    
    # Add exact matches first
    for card_name, price in prices.items():
        lookup[card_name] = (card_name, price)
    
    # Add normalized versions with base names (removing parenthetical)
    for card_name, price in prices.items():
        # Normalize the full name
        norm_name = normalize_card_name(card_name)
        if norm_name not in lookup:
            lookup[norm_name] = (card_name, price)
        
        # Also try base name without parenthetical (e.g., "Stream (Preconstructed Deck)" -> "Stream")
        if '(' in card_name:
            base_name = card_name.split('(')[0].strip()
            norm_base = normalize_card_name(base_name)
            if norm_base not in lookup:
                lookup[norm_base] = (card_name, price)
    
    return lookup


def fetch_sorcery_prices() -> Dict[str, float]:
    """
    Fetch pricing data from tcgcsv.com API for Sorcery: Contested Realm.
    
    Returns:
        Dictionary mapping card name -> lowest price
    """
    print("📡 Fetching groups for Sorcery: Contested Realm (category 77)...")
    
    # Sorcery: Contested Realm category ID
    category_id = 77
    
    # Fetch all groups (sets) for this category
    groups_url = f"https://tcgcsv.com/tcgplayer/{category_id}/groups"
    try:
        response = requests.get(groups_url, timeout=30)
        response.raise_for_status()
        groups = response.json()['results']
    except Exception as e:
        print(f"❌ Error fetching groups: {e}")
        sys.exit(1)
    
    print(f"✓ Found {len(groups)} groups")
    
    card_prices = {}  # card_name -> list of prices
    
    # Process each group (set)
    for group in groups:
        group_id = group['groupId']
        group_name = group['name']
        print(f"  Processing {group_name}...")
        
        # Fetch prices for this group
        prices_url = f"https://tcgcsv.com/tcgplayer/{category_id}/{group_id}/prices"
        try:
            response = requests.get(prices_url, timeout=30)
            response.raise_for_status()
            prices_data = response.json()['results']
            
            # Also need product info to get card names
            products_url = f"https://tcgcsv.com/tcgplayer/{category_id}/{group_id}/products"
            response = requests.get(products_url, timeout=30)
            response.raise_for_status()
            products = response.json()['results']
            
            # Build product ID to name mapping
            product_names = {p['productId']: p['name'] for p in products}
            
            # Process prices
            for price_entry in prices_data:
                product_id = price_entry['productId']
                if product_id not in product_names:
                    continue
                    
                # Get card name (remove foil suffix if present)
                card_name = product_names[product_id].replace(' (Foil)', '').strip()
                
                # Use lowPrice (lowest available listing) if available
                low_price = price_entry.get('lowPrice')
                if low_price and low_price > 0:
                    if card_name not in card_prices:
                        card_prices[card_name] = []
                    card_prices[card_name].append(low_price)
                    
        except Exception as e:
            print(f"    ⚠️  Error fetching prices for {group_name}: {e}")
            continue
    
    # Find minimum price for each card
    min_prices = {
        card: min(prices)
        for card, prices in card_prices.items()
    }
    
    print(f"✓ Processed {len(min_prices)} unique cards")
    return min_prices


def update_master_cards(prices: Dict[str, float], master_cards_path: str) -> None:
    """
    Update master_cards.json with price data.
    
    Creates a backup before modifying.
    """
    print("\n📝 Updating master_cards.json...")
    
    # Load existing master_cards.json
    with open(master_cards_path, 'r', encoding='utf-8') as f:
        cards = json.load(f)
    
    # Create backup
    backup_path = f"{master_cards_path}.backup"
    with open(backup_path, 'w', encoding='utf-8') as f:
        json.dump(cards, f, indent=2)
    print(f"  ✓ Created backup at: {backup_path}")
    
    # Create price lookup with fuzzy matching
    price_lookup = create_price_lookup(prices)
    
    # Update prices
    matched = 0
    unmatched = 0
    fuzzy_matched = []
    
    for card_name, card_data in cards.items():
        # Try exact match first
        if card_name in prices:
            card_data['price_usd'] = round(prices[card_name], 2)
            matched += 1
        else:
            # Try normalized/fuzzy match
            norm_name = normalize_card_name(card_name)
            if norm_name in price_lookup:
                original_name, price = price_lookup[norm_name]
                card_data['price_usd'] = round(price, 2)
                matched += 1
                if original_name != card_name:
                    fuzzy_matched.append(f"    '{card_name}' -> '{original_name}'")
            else:
                # Keep existing price if not found in new data
                unmatched += 1
    
    # Save updated master_cards.json
    with open(master_cards_path, 'w', encoding='utf-8') as f:
        json.dump(cards, f, indent=2)
    
    print(f"\n✅ Updated {matched} cards with pricing data")
    if fuzzy_matched:
        print(f"🔍 Fuzzy matched {len(fuzzy_matched)} cards:")
        for match in fuzzy_matched[:10]:  # Show first 10
            print(match)
        if len(fuzzy_matched) > 10:
            print(f"    ... and {len(fuzzy_matched) - 10} more")
    if unmatched > 0:
        print(f"⚠️  {unmatched} cards not found in pricing data (kept existing prices)")
    print(f"\nSaved to: {master_cards_path}")


def main():
    # Get project root (parent of scripts directory)
    script_dir = Path(__file__).parent
    project_dir = script_dir.parent
    master_cards_path = project_dir / "card_data" / "master_cards.json"
    
    print("🎴 Sorcery Card Price Updater")
    print(f"📂 Project: {project_dir}")
    print(f"📄 Target: {master_cards_path}\n")
    
    # Fetch prices from tcgcsv.com
    prices = fetch_sorcery_prices()
    
    if not prices:
        print("❌ No pricing data retrieved. Exiting.")
        sys.exit(1)
    
    # Update master_cards.json
    update_master_cards(prices, str(master_cards_path))
    
    print("\n🎉 Price update complete!")


if __name__ == "__main__":
    main()

