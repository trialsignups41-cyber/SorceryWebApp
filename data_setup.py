import requests
import json
import os
from typing import Dict, Any, List

# --- Configuration ---
API_ENDPOINT = "https://api.sorcerytcg.com/api/cards"
OUTPUT_FILE = 'card_data/master_cards.json'
STANDARD_FINISH_CODES = ['Standard', 's'] # Codes to prioritize for the IOU image

# Ensure the output directory exists
os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

# --- Helper Functions ---
def get_preferred_slug(variants: List[Dict[str, Any]]) -> str | None:
    """
    Finds the slug for the 'Standard' finish variant, or defaults to the first slug found.
    """
    default_slug = None
    
    # First, look for a variant that is explicitly 'Standard'
    for variant in variants:
        slug = variant.get('slug')
        finish = variant.get('finish')
        
        if not default_slug:
            default_slug = slug # Keep the first one as a backup
            
        if finish in STANDARD_FINISH_CODES:
            return slug # Found the preferred standard finish
            
    return default_slug

def extract_metadata(card_entry: Dict[str, Any]) -> Dict[str, Any]:
    """Extracts reliable metadata and the preferred image slug."""
    
    # Prioritize metadata from the first set/printing entry
    metadata = {}
    variants = []
    
    if card_entry.get('sets') and card_entry['sets'][0].get('metadata'):
        metadata = card_entry['sets'][0]['metadata']
        variants = card_entry['sets'][0].get('variants', [])
    elif card_entry.get('guardian'):
        metadata = card_entry['guardian']
        
    # Get the preferred slug for the image filename
    image_slug = get_preferred_slug(variants)

    # Extract specific fields
    processed_data = {
        # Core Identifiers for Flask App
        'name': card_entry.get('name'),
        'set_name': card_entry.get('sets', [{}])[0].get('name'),
        
        # Filtering Data
        'rarity': metadata.get('rarity'),
        'card_type': metadata.get('type'),
        
        # Game Stats (Note: None is correct for Sites/Spells)
        'mana_cost': metadata.get('cost'),
        'attack': metadata.get('attack'),
        'defence': metadata.get('defence'),
        
        # Image Filename (CRITICAL for local cache)
        # Naming pattern is [set]-[card_slug]-[b/a]-[s/f].png
        'image_file': f"{image_slug}.png" if image_slug else 'MISSING_IMAGE.png',
        
        # Placeholder for price and rules text
        'price_usd': 0.00,
        'rules_text': metadata.get('rulesText'),
    }
    
    return processed_data


# --- Core Execution Function ---
def fetch_and_process_cards():
    """Fetches, processes, and saves card data."""
    print(f"1. Fetching data from API: {API_ENDPOINT}...")
    try:
        response = requests.get(API_ENDPOINT)
        response.raise_for_status() 
        raw_card_data = response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching data: {e}")
        return

    master_card_db = {}
    print(f"Successfully received {len(raw_card_data)} total card entries.")

    print("2. Processing and reformatting card data...")

    # Iterate through the top-level list of card entries
    for card_entry in raw_card_data:
        card_name = card_entry.get('name')
        if not card_name:
            continue

        processed_data = extract_metadata(card_entry)
                
        # Store in our final dictionary keyed by name for O(1) lookups in Flask
        master_card_db[card_name] = processed_data

    print(f"Processed {len(master_card_db)} unique base cards.")

    # 3. Write data to the final file
    try:
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(master_card_db, f, ensure_ascii=False, indent=4)
        print(f"3. Success! Data saved to {OUTPUT_FILE}")
        
        # --- Crucial Check for Image Task ---
        example_card = next(iter(master_card_db.values()))
        print("\n--- Example Output for Image Check ---")
        print(f"Example Card Name: {example_card.get('name')}")
        print(f"Image Filename: {example_card.get('image_file')}")
        print("--------------------------------------")
        print("Ensure the Image Filenames (e.g., 'got-sow_the_earth-b-s.png')")
        print("EXACTLY match the files downloaded from the Google Drive.")

    except IOError as e:
        print(f"Error writing file: {e}")

if __name__ == "__main__":
    fetch_and_process_cards()