#!/usr/bin/env python3
"""
Script to fix corrupted card image URLs in master_cards.json
by finding the actual image files in the source folder and using their filenames
"""

import json
from pathlib import Path
from collections import defaultdict

# Configuration
CORRUPTED_IMAGES_PATH = Path(__file__).parent / "corrupted_images.json"
MASTER_CARDS_PATH = Path(__file__).parent / "card_data" / "master_cards.json"
SOURCE_IMAGES_PATH = Path.home() / "Downloads" / "Card Images (API)"

def build_filename_map():
    """
    Build a map of card base names to available image files
    Returns: dict mapping base_name -> list of available suffixes (s.png, f.png, etc)
    """
    filename_map = defaultdict(list)
    
    if not SOURCE_IMAGES_PATH.exists():
        print(f"❌ Error: Source folder not found at {SOURCE_IMAGES_PATH}")
        return None
    
    print(f"Scanning image folder: {SOURCE_IMAGES_PATH}\n")
    
    # Find all PNG files
    png_files = list(SOURCE_IMAGES_PATH.glob("*.png"))
    print(f"Found {len(png_files)} PNG files\n")
    
    # Map filenames
    for png_file in png_files:
        filename = png_file.stem  # e.g., "alp-apprentice_wizard-b-s"
        # Extract the suffix (s, f, etc.)
        parts = filename.rsplit('-', 1)
        if len(parts) == 2:
            base_name = parts[0]  # e.g., "alp-apprentice_wizard-b"
            suffix = parts[1]      # e.g., "s"
            filename_map[base_name].append(suffix)
    
    return filename_map

def find_correct_url(current_url, filename_map):
    """
    Find the correct URL based on available files in the source folder
    Prefers: f.png > s.png > any other available suffix
    Returns: (new_url, suffix_used) or (None, None) if not found
    """
    if not current_url or "sorcery-proxy-images" not in current_url:
        return None, None
    
    # Extract base filename from URL (e.g., "alp-apprentice_wizard-b")
    filename_part = current_url.split('/')[-1]  # e.g., "alp-apprentice_wizard-b-s.png"
    filename_base = filename_part.rsplit('-', 1)[0]  # e.g., "alp-apprentice_wizard-b"
    
    if filename_base not in filename_map:
        return None, None
    
    available_suffixes = filename_map[filename_base]
    
    # Prefer foil (f), then standard (s), then any other
    preferred_order = ['f', 's']
    for suffix in preferred_order:
        if suffix in available_suffixes:
            new_url = current_url.rsplit('-', 1)[0] + f"-{suffix}.png"
            return new_url, suffix
    
    # If neither f nor s available, use the first available
    if available_suffixes:
        suffix = available_suffixes[0]
        new_url = current_url.rsplit('-', 1)[0] + f"-{suffix}.png"
        return new_url, suffix
    
    return None, None

def main():
    """Main function to fix corrupted image URLs"""
    
    # Build filename map from source folder
    filename_map = build_filename_map()
    if filename_map is None:
        return
    
    # Check if corrupted_images.json exists
    if not CORRUPTED_IMAGES_PATH.exists():
        print("❌ Error: corrupted_images.json not found")
        print(f"   Please run check_corrupted_images.py first")
        return
    
    print(f"\nLoading corrupted_images.json...")
    with open(CORRUPTED_IMAGES_PATH, 'r') as f:
        corrupted_cards = json.load(f)
    
    print(f"Found {len(corrupted_cards)} corrupted cards\n")
    
    # Load master_cards.json
    print("Loading master_cards.json...")
    with open(MASTER_CARDS_PATH, 'r') as f:
        cards_data = json.load(f)
    
    # Track changes
    updated_count = 0
    not_found_in_data = 0
    no_source_file = 0
    changes = []
    
    print("\nProcessing corrupted cards...\n")
    
    # Fix each corrupted card
    for corrupted_card in corrupted_cards:
        card_name = corrupted_card['name']
        
        if card_name not in cards_data:
            print(f"⚠️  Card not found in master_cards.json: {card_name}")
            not_found_in_data += 1
            continue
        
        current_url = cards_data[card_name].get('image_url', '')
        new_url, suffix_used = find_correct_url(current_url, filename_map)
        
        if new_url:
            cards_data[card_name]['image_url'] = new_url
            updated_count += 1
            changes.append({
                'card': card_name,
                'old': current_url,
                'new': new_url,
                'suffix': suffix_used
            })
            print(f"✅ Updated: {card_name}")
            print(f"   Suffix: {suffix_used}.png")
            print(f"   From: {current_url}")
            print(f"   To:   {new_url}\n")
        else:
            print(f"❌ No source file found: {card_name}")
            print(f"   URL: {current_url}\n")
            no_source_file += 1
    
    # Ask for confirmation before saving
    print("="*80)
    print("SUMMARY")
    print("="*80)
    print(f"Cards updated: {updated_count}")
    print(f"Cards not found in master_cards.json: {not_found_in_data}")
    print(f"No source file found: {no_source_file}")
    print(f"Total corrupted: {len(corrupted_cards)}")
    
    if updated_count > 0:
        response = input("\n⚠️  Are you sure you want to update the master_cards.json file? (yes/no): ").strip().lower()
        
        if response == 'yes':
            # Backup original file
            backup_path = MASTER_CARDS_PATH.with_suffix('.json.backup2')
            with open(MASTER_CARDS_PATH, 'r') as f:
                backup_data = f.read()
            with open(backup_path, 'w') as f:
                f.write(backup_data)
            print(f"\n✅ Backup created: {backup_path}")
            
            # Save updated file
            with open(MASTER_CARDS_PATH, 'w') as f:
                json.dump(cards_data, f, indent=4)
            print(f"✅ Updated master_cards.json with {updated_count} changes")
            
            # Save detailed change log
            changelog_path = Path(__file__).parent / "image_url_fixes.json"
            with open(changelog_path, 'w') as f:
                json.dump(changes, f, indent=2)
            print(f"✅ Change log saved to: {changelog_path}")
        else:
            print("\n❌ Update cancelled - no changes made")
    else:
        print("\n✅ No URLs to update")

if __name__ == "__main__":
    main()
