# test_enrichment_logic.py
import sys
import os
import json

# Ensure we can import modules from the api directory
sys.path.insert(0, os.path.join(os.getcwd(), 'api'))

# Import the core function and the CARD_DB/load logic
from index import load_card_db, CARD_DB, enrich_and_match_data

print("--- Testing Data Enrichment and Matching Logic ---")

# Ensure the database is loaded (needed for realistic metadata lookup)
load_card_db()

if not CARD_DB:
    print("\nWARNING: CARD_DB failed to load. Using mock metadata for testing.")

# 1. Define Mock Master Card Data (Only used if the real DB fails to load)
# NOTE: The real test uses the loaded CARD_DB.
MOCK_METADATA = {
    "Adept Illusionist": {
        "image_url": "s3-url-1",
        "rarity": "Exceptional",
        "price_usd": 15.00,
        "mana_cost": 3,
        "image_file": "illusionist_slug.png"
    },
    "Mesmerism": {
        "image_url": "s3-url-2",
        "rarity": "Unique",
        "price_usd": 150.00,
        "mana_cost": 4,
        "image_file": "mesmerism_slug.png"
    },
    # Added Diluvian Kraken here for robustness, although it should be in the real DB
    "Diluvian Kraken": {
        "image_url": "s3-url-3",
        "rarity": "Unique",
        "price_usd": 80.00,
        "mana_cost": 7,
        "image_file": "kraken_slug.png"
    },
    "Missing Card X": {
        "image_url": "s3-url-3",
        "rarity": "Ordinary",
        "price_usd": 1.00,
        "mana_cost": 1,
        "image_file": "missingx_slug.png"
    },
}

# 2. Define Mock Inputs
# Owned Collection: What the user uploaded in their CSV
mock_owned_collection = [
    {'name': 'Adept Illusionist', 'quantity': 4, 'set': 'Base', 'finish': 'Standard'}, # Fully covers deck
    {'name': 'Mesmerism', 'quantity': 2, 'set': 'Base', 'finish': 'Standard'},        # Partially covers deck
    # Deliberately exclude Diluvian Kraken to test the 'Missing' status
]

# Target Decklist: What the deck requires
mock_decklist = [
    # Case 1: Owned 4, Needed 3 -> Status: Complete, Net Needed: 0
    {'name': 'Adept Illusionist', 'quantity': 3},
    
    # Case 2: Owned 2, Needed 5 -> Status: Proxy_Needed, Net Needed: 3
    {'name': 'Mesmerism', 'quantity': 5},
    
    # Case 3: Owned 0, Needed 4 -> Status: Missing (Using a known card name)
    {'name': 'Diluvian Kraken', 'quantity': 4}, 
]

# Use the real CARD_DB if loaded, otherwise use the mock data
db_to_use = CARD_DB if CARD_DB else MOCK_METADATA


# 3. Execute the Function
print("\n[TEST] Running Enrichment Logic...")
enriched_result = enrich_and_match_data(mock_decklist, mock_owned_collection, db_to_use)


# 4. Verify Output and Statuses
print("\n[RESULTS] Verification Check:")
print("-" * 50)
passes = True
expected_results = {
    "Adept Illusionist": {"owned_quantity": 4, "net_needed_quantity": 0, "status": "Complete"},
    "Mesmerism": {"owned_quantity": 2, "net_needed_quantity": 3, "status": "Proxy_Needed"},
    # Corrected expectation for the 'Missing' case
    "Diluvian Kraken": {"owned_quantity": 0, "net_needed_quantity": 4, "status": "Missing"}, 
}

for card in enriched_result:
    name = card['name']
    expected = expected_results.get(name)
    
    if expected:
        # Check ownership and net need calculation
        if card['owned_quantity'] != expected['owned_quantity']:
            print(f"FAIL: {name} - Owned quantity mismatch ({card['owned_quantity']} vs {expected['owned_quantity']})")
            passes = False
        
        # Check proxy need calculation
        if card['net_needed_quantity'] != expected['net_needed_quantity']:
            print(f"FAIL: {name} - Net Needed mismatch ({card['net_needed_quantity']} vs {expected['net_needed_quantity']})")
            passes = False

        # Check final status assignment
        if card['status'] != expected['status']:
            print(f"FAIL: {name} - Status mismatch ('{card['status']}' vs '{expected['status']}')")
            passes = False

        # Check metadata attachment (only needs to be done once)
        if name == "Mesmerism" and 'rarity' not in card:
            print(f"FAIL: {name} - Metadata (Rarity) was not attached.")
            passes = False

# Final Summary
if passes:
    print("✅ All enrichment and matching tests passed successfully.")
else:
    print("❌ One or more enrichment tests failed.")

# Print the final result for inspection
print("\nFinal Enriched Decklist Sample:")
for card in enriched_result:
    print(f"- {card['name']:<20} | Req: {card['required_quantity']:<2} | Owned: {card['owned_quantity']:<2} | Proxy: {card['net_needed_quantity']:<2} | Status: {card['status']}")