# test_deck_resolver.py
import sys
import os
import json

# Ensure we can import modules from the api directory
sys.path.insert(0, os.path.join(os.getcwd(), 'api'))

# Import the functions directly from index.py
# NOTE: This imports the Flask app 'app', but doesn't run it yet.
from index import extract_deck_id, resolve_decklist_from_url

print("--- Testing Deck Resolver Functions ---")

# --- 1. Test ID Extraction (extract_deck_id) ---
print("\n[TEST 1.1] Testing ID Extraction:")
test_urls = {
    "Full URL": "https://curiosa.io/decks/view/cmiwp5nmv6idr05eb8a09qm0d",
    "Short URL": "curiosa.io/decks/view/somerandomid",
    "No Path": "https://curiosa.io/somerandomid2",
    "Invalid/Root": "https://curiosa.io/decks/"
}

for label, url in test_urls.items():
    result = extract_deck_id(url)
    print(f"  {label:<15} ({url[-20:]:<20}) -> ID: {result}")


# --- 2. Test Full Deck Resolution (resolve_decklist_from_url) ---
print("\n[TEST 2.1] Testing Full Decklist Resolution (Live API Call):")

# Use a known working ID for integration test (the one you provided)
WORKING_URL = "https://curiosa.io/decks/view/cmiwp5nmv6idr05eb8a09qm0d"

# NOTE: The actual API call is made here.
decklist = resolve_decklist_from_url(WORKING_URL)

if decklist:
    print(f"\nSUCCESS: Resolved {len(decklist)} unique cards from the live API.")
    # Check the total quantity of cards (e.g., should be 40+ cards)
    total_quantity = sum(c['quantity'] for c in decklist)
    print(f"Total cards in deck: {total_quantity}")
    
    # Print the first few cards to verify structure
    print("Sample Output:")
    for card in decklist[:3]:
        print(f"  - {card['quantity']}x {card['name']}")

else:
    print("\nFAILURE: Decklist resolution failed (Check headers, ID, or parsing logic).")
    
# --- 3. Test Failure Case ---
print("\n[TEST 3.1] Testing Non-Existent ID:")
FAILURE_URL = "https://curiosa.io/decks/view/nonexistentdeckid123"
failure_result = resolve_decklist_from_url(FAILURE_URL)

if not failure_result:
    print("SUCCESS: Non-existent ID returned an empty list.")
else:
    print("FAILURE: Non-existent ID returned data unexpectedly.")