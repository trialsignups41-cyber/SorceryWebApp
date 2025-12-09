#!/usr/bin/env python3
"""
Script to identify corrupted card images in master_cards.json
Tests each image URL for validity and reports issues
"""

import json
import requests
from PIL import Image
from io import BytesIO
import time
from pathlib import Path

# Configuration
MASTER_CARDS_PATH = Path(__file__).parent / "card_data" / "master_cards.json"
REQUEST_TIMEOUT = 10
BATCH_SIZE = 10  # Process in batches with delay to avoid rate limiting

def check_image_validity(image_url):
    """
    Check if an image URL is valid and the image can be loaded
    Returns: (is_valid, error_message)
    """
    try:
        response = requests.get(image_url, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
        
        # Check Content-Type
        content_type = response.headers.get('Content-Type', '')
        if 'image' not in content_type:
            return False, f"Invalid Content-Type: {content_type}"
        
        # Try to open and verify image
        img = Image.open(BytesIO(response.content))
        img.load()  # Force load to catch issues
        
        return True, None
    except requests.exceptions.Timeout:
        return False, "Timeout"
    except requests.exceptions.ConnectionError:
        return False, "Connection error"
    except requests.exceptions.HTTPError as e:
        return False, f"HTTP {response.status_code}"
    except Image.UnidentifiedImageError:
        return False, "Invalid image format"
    except Exception as e:
        return False, str(e)

def main():
    """Main function to check all card images"""
    print("Loading master_cards.json...")
    
    with open(MASTER_CARDS_PATH, 'r') as f:
        cards_data = json.load(f)
    
    total_cards = len(cards_data)
    print(f"Found {total_cards} cards to check\n")
    
    corrupted_cards = []
    valid_count = 0
    checked_count = 0
    
    # Process cards in batches
    card_items = list(cards_data.items())
    
    for i, (card_name, card_info) in enumerate(card_items):
        checked_count += 1
        image_url = card_info.get('image_url', '')
        
        if not image_url:
            corrupted_cards.append({
                'name': card_name,
                'error': 'No image URL'
            })
            print(f"[{checked_count}/{total_cards}] ❌ {card_name}: No image URL")
            continue
        
        # Check image validity
        is_valid, error = check_image_validity(image_url)
        
        if is_valid:
            valid_count += 1
            print(f"[{checked_count}/{total_cards}] ✅ {card_name}")
        else:
            corrupted_cards.append({
                'name': card_name,
                'image_url': image_url,
                'error': error
            })
            print(f"[{checked_count}/{total_cards}] ❌ {card_name}: {error}")
        
        # Add delay every BATCH_SIZE requests to avoid rate limiting
        if (checked_count + 1) % BATCH_SIZE == 0:
            print(f"   Waiting 2 seconds before next batch...")
            time.sleep(2)
    
    # Print summary
    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)
    print(f"Total cards checked: {total_cards}")
    print(f"Valid images: {valid_count}")
    print(f"Corrupted images: {len(corrupted_cards)}")
    
    if corrupted_cards:
        print("\n" + "="*80)
        print("CORRUPTED IMAGES DETAILS")
        print("="*80)
        
        for card in corrupted_cards:
            print(f"\nCard: {card['name']}")
            print(f"Error: {card['error']}")
            if 'image_url' in card:
                print(f"URL: {card['image_url']}")
        
        # Save corrupted cards to file
        output_path = Path(__file__).parent / "corrupted_images.json"
        with open(output_path, 'w') as f:
            json.dump(corrupted_cards, f, indent=2)
        print(f"\n✅ Corrupted images list saved to: {output_path}")
    else:
        print("\n✅ All images are valid!")

if __name__ == "__main__":
    main()
