#!/usr/bin/env python3
"""
Script to validate and update card image URLs in master_cards.json
to match actual filenames in the Card Images (API) 2 folder.
"""

import json
import os
import re
from pathlib import Path
from urllib.parse import urlparse

# Paths
SCRIPT_DIR = Path(__file__).parent
MASTER_CARDS_PATH = SCRIPT_DIR / "card_data" / "master_cards.json"
CARD_IMAGES_DIR = Path("/Users/james/Downloads/Card Images (API) 2")

# S3 base URL
S3_BASE_URL = "https://sorcery-proxy-images.s3.us-east-2.amazonaws.com/"


def extract_filename_from_url(url: str) -> str:
    """Extract the filename from an S3 URL."""
    parsed = urlparse(url)
    return Path(parsed.path).name


def find_matching_image(card_name: str, set_name: str, available_files: set) -> str | None:
    """
    Try to find a matching image file for a card.
    
    Strategy:
    1. Try exact URL filename match
    2. Try constructing expected filename patterns
    3. Try fuzzy matching on card name
    """
    # Normalize card name to filename format
    # Convert to lowercase, replace spaces/apostrophes with underscores
    normalized_name = card_name.lower()
    normalized_name = re.sub(r"['\"]", "", normalized_name)
    normalized_name = re.sub(r"[\s\-]+", "_", normalized_name)
    
    # Determine set prefix
    set_prefixes = {
        "Alpha": "alp",
        "Arthurian Legends": "art",
        "Beta": "bet",
        "Dragons": "dra",
        "Gods": "got",
        "Promo": "pro"
    }
    set_prefix = set_prefixes.get(set_name, set_name.lower()[:3])
    
    # Common suffixes to try (in order of preference)
    suffixes = [
        "-b-s.png",  # Beta standard
        "-b-f.png",  # Beta foil
        "-bt-s.png", # Beta tournament
        "-bt-f.png", # Beta tournament foil
        "-pd-s.png", # Prerelease
        "-ai-f.png", # Alternative art
        "-wk-s.png", # Weekly
        "-op-f.png", # Open
        "-k-s.png",  # Kickstarter
        "-d-f.png",  # Demo
        "-dk-s.png", # Demo kickstarter
    ]
    
    # Try each suffix pattern
    for suffix in suffixes:
        candidate = f"{set_prefix}-{normalized_name}{suffix}"
        if candidate in available_files:
            return candidate
    
    # Fuzzy search: find any file that starts with the set prefix and contains the normalized name
    for file in available_files:
        if file.startswith(set_prefix) and normalized_name in file:
            return file
    
    return None


def main():
    print("=" * 80)
    print("Card Image URL Validator and Updater")
    print("=" * 80)
    
    # Load master cards
    print(f"\n📖 Loading master_cards.json from: {MASTER_CARDS_PATH}")
    with open(MASTER_CARDS_PATH, 'r', encoding='utf-8') as f:
        master_cards = json.load(f)
    
    print(f"✅ Loaded {len(master_cards)} cards")
    
    # Get available image files
    print(f"\n📁 Scanning card images directory: {CARD_IMAGES_DIR}")
    if not CARD_IMAGES_DIR.exists():
        print(f"❌ ERROR: Card images directory not found!")
        return 1
    
    available_files = set()
    for file in CARD_IMAGES_DIR.iterdir():
        if file.is_file() and file.suffix.lower() == '.png':
            available_files.add(file.name)
    
    print(f"✅ Found {len(available_files)} PNG files")
    
    # Analyze and update cards
    print(f"\n🔍 Analyzing cards...")
    
    stats = {
        'total': len(master_cards),
        'matched': 0,
        'mismatched': 0,
        'missing': 0,
        'updated': 0
    }
    
    mismatched_cards = []
    missing_cards = []
    
    for card_name, card_data in master_cards.items():
        current_url = card_data.get('image_url', '')
        
        # Skip if no URL
        if not current_url:
            stats['missing'] += 1
            missing_cards.append(card_name)
            continue
        
        # Extract current filename
        current_filename = extract_filename_from_url(current_url)
        
        # Check if current filename exists
        if current_filename in available_files:
            stats['matched'] += 1
        else:
            stats['mismatched'] += 1
            
            # Try to find a matching file
            set_name = card_data.get('set_name', 'Unknown')
            matching_file = find_matching_image(card_name, set_name, available_files)
            
            if matching_file:
                # Update the URL
                new_url = S3_BASE_URL + matching_file
                card_data['image_url'] = new_url
                stats['updated'] += 1
                mismatched_cards.append({
                    'name': card_name,
                    'set': set_name,
                    'old_file': current_filename,
                    'new_file': matching_file,
                    'status': '✅ UPDATED'
                })
            else:
                mismatched_cards.append({
                    'name': card_name,
                    'set': set_name,
                    'old_file': current_filename,
                    'new_file': None,
                    'status': '❌ NO MATCH FOUND'
                })
    
    # Print results
    print(f"\n" + "=" * 80)
    print("RESULTS")
    print("=" * 80)
    print(f"Total cards:           {stats['total']}")
    print(f"✅ Already matched:    {stats['matched']}")
    print(f"🔄 Mismatched:         {stats['mismatched']}")
    print(f"📝 Updated:            {stats['updated']}")
    print(f"❌ Missing URLs:       {stats['missing']}")
    print(f"⚠️  Still unmatched:   {stats['mismatched'] - stats['updated']}")
    
    # Show mismatched cards
    if mismatched_cards:
        print(f"\n" + "=" * 80)
        print("MISMATCHED CARDS")
        print("=" * 80)
        for card in mismatched_cards:
            print(f"\n{card['status']} {card['name']} ({card['set']})")
            print(f"  Old: {card['old_file']}")
            if card['new_file']:
                print(f"  New: {card['new_file']}")
    
    # Show missing cards
    if missing_cards:
        print(f"\n" + "=" * 80)
        print("MISSING IMAGE URLS ({len(missing_cards)} cards)")
        print("=" * 80)
        for card in missing_cards[:20]:  # Show first 20
            print(f"  - {card}")
        if len(missing_cards) > 20:
            print(f"  ... and {len(missing_cards) - 20} more")
    
    # Save updated file
    if stats['updated'] > 0:
        print(f"\n💾 Saving updated master_cards.json...")
        
        # Create backup
        backup_path = MASTER_CARDS_PATH.with_suffix('.json.backup')
        with open(MASTER_CARDS_PATH, 'r', encoding='utf-8') as f:
            with open(backup_path, 'w', encoding='utf-8') as backup:
                backup.write(f.read())
        print(f"📦 Backup saved to: {backup_path}")
        
        # Save updated file
        with open(MASTER_CARDS_PATH, 'w', encoding='utf-8') as f:
            json.dump(master_cards, f, indent=4, ensure_ascii=False)
        print(f"✅ Updated file saved!")
    else:
        print(f"\n✨ No updates needed - all URLs already match!")
    
    print(f"\n" + "=" * 80)
    print("COMPLETE")
    print("=" * 80)
    
    return 0


if __name__ == "__main__":
    exit(main())
