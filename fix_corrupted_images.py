#!/usr/bin/env python3
"""
Script to fix corrupted card image URLs in master_cards.json
Converts s.png URLs to f.png URLs for cards that only have foil versions
"""

import json
from pathlib import Path

# Configuration
CORRUPTED_IMAGES_PATH = Path(__file__).parent / "corrupted_images.json"
MASTER_CARDS_PATH = Path(__file__).parent / "card_data" / "master_cards.json"

def main():
    """Main function to fix corrupted image URLs"""
    
    # Check if corrupted_images.json exists
    if not CORRUPTED_IMAGES_PATH.exists():
        print("❌ Error: corrupted_images.json not found")
        print(f"   Please run check_corrupted_images.py first")
        return
    
    print("Loading corrupted_images.json...")
    with open(CORRUPTED_IMAGES_PATH, 'r') as f:
        corrupted_cards = json.load(f)
    
    print(f"Found {len(corrupted_cards)} corrupted cards\n")
    
    # Load master_cards.json
    print("Loading master_cards.json...")
    with open(MASTER_CARDS_PATH, 'r') as f:
        cards_data = json.load(f)
    
    # Track changes
    updated_count = 0
    not_found_count = 0
    already_foil_count = 0
    
    print("\nProcessing corrupted cards...\n")
    
    # Fix each corrupted card
    for corrupted_card in corrupted_cards:
        card_name = corrupted_card['name']
        
        if card_name not in cards_data:
            print(f"⚠️  Card not found in master_cards.json: {card_name}")
            not_found_count += 1
            continue
        
        current_url = cards_data[card_name].get('image_url', '')
        
        # Check if URL ends with s.png
        if current_url.endswith('-s.png'):
            # Convert to f.png
            new_url = current_url.replace('-s.png', '-f.png')
            cards_data[card_name]['image_url'] = new_url
            updated_count += 1
            print(f"✅ Updated: {card_name}")
            print(f"   From: {current_url}")
            print(f"   To:   {new_url}\n")
        elif current_url.endswith('-f.png'):
            print(f"ℹ️  Already foil: {card_name}")
            already_foil_count += 1
        else:
            print(f"⚠️  Unexpected URL format: {card_name}")
            print(f"   URL: {current_url}\n")
    
    # Ask for confirmation before saving
    print("="*80)
    print("SUMMARY")
    print("="*80)
    print(f"Cards to update: {updated_count}")
    print(f"Already foil: {already_foil_count}")
    print(f"Not found: {not_found_count}")
    print(f"Total corrupted: {len(corrupted_cards)}")
    
    if updated_count > 0:
        response = input("\n⚠️  Are you sure you want to update the master_cards.json file? (yes/no): ").strip().lower()
        
        if response == 'yes':
            # Backup original file
            backup_path = MASTER_CARDS_PATH.with_suffix('.json.backup')
            with open(MASTER_CARDS_PATH, 'r') as f:
                backup_data = f.read()
            with open(backup_path, 'w') as f:
                f.write(backup_data)
            print(f"\n✅ Backup created: {backup_path}")
            
            # Save updated file
            with open(MASTER_CARDS_PATH, 'w') as f:
                json.dump(cards_data, f, indent=4)
            print(f"✅ Updated master_cards.json with {updated_count} changes")
        else:
            print("\n❌ Update cancelled - no changes made")
    else:
        print("\n✅ No URLs to update")

if __name__ == "__main__":
    main()
