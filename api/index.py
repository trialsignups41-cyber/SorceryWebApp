import json
import os
import io
import csv
import requests
import re #For Regex matching the deck ID
from urllib.parse import quote #for safe url encoding

from flask import Flask, jsonify, request, send_file
from flask_cors import CORS 

# --- Configuration & Global Variables ---

# Path to the master card data, relative to the project root (where Vercel runs the script)
MASTER_DATA_PATH = 'card_data/master_cards.json'
CARD_DB = {}
VERSION = "1.0.0" 

# --- Initialization Logic ---

def load_card_db():
    """Loads the static master card data JSON into memory (CARD_DB)."""
    global CARD_DB
    
    print(f"Current working directory: {os.getcwd()}") 
    
    try:
        if not os.path.exists(MASTER_DATA_PATH):
            print(f"ERROR: Master data file not found at {MASTER_DATA_PATH}")
            return

        with open(MASTER_DATA_PATH, 'r', encoding='utf-8') as f:
            CARD_DB = json.load(f)
        print(f"SUCCESS: Loaded {len(CARD_DB)} unique cards into memory.")
        
        if CARD_DB:
            first_card = next(iter(CARD_DB.values()))
            print(f"Example Card Data Loaded (Name: {first_card.get('name')}, URL: {first_card.get('image_url')})")

    except Exception as e:
        print(f"CRITICAL ERROR: Failed to load card database: {e}")

# --- Input Parsing Helper (Task 2.2.1 - 2.2.3) ---

def parse_curiosa_export(file_stream: io.StringIO) -> list:
    """
    Parses the Curiosa CSV export file stream into a list of owned cards.
    """
    owned_collection = []
    
    # Use csv.DictReader to map the header row to dictionary keys
    reader = csv.DictReader(file_stream)
    
    for row in reader:
        try:
            # We use the column names identified from your sample CSV
            card_name = row.get('card name', '').strip()
            quantity = int(row.get('quantity', 0))
            
            if card_name and quantity > 0:
                owned_collection.append({
                    'name': card_name,
                    'quantity': quantity,
                    'set': row.get('set'), 
                    'finish': row.get('finish')
                })
        except ValueError:
            # Skip rows where quantity isn't a valid number
            continue
            
    return owned_collection

# --- Decklink Resolution (Task 2.2.8) ---

def extract_deck_id(url: str) -> str | None:
    """
    Extracts the unique Deck ID from various Curiosa URL formats.
    e.g., https://curiosa.io/decks/view/cmiwp5nmv6idr05eb8a09qm0d
    """
    # Regex to capture the ID after 'view/' or as the last path segment
    match = re.search(r'view/([a-z0-9]+)|([a-z0-9]+)$', url)
    if match:
        # The ID will be in group 1 or group 2
        return match.group(1) or match.group(2)
    return None

def resolve_decklist_from_url(url: str) -> list:
    """
    Fetches the decklist data using the discovered Curiosa tRPC API endpoint.
    """
    deck_id = extract_deck_id(url)
    
    if not deck_id:
        print(f"ERROR: Could not extract valid ID from URL: {url}")
        return []

    # 1. Build the simplified JSON payload for the tRPC input query parameter
    # We only request the decklist and not the avatar/sideboard
    input_payload = json.dumps({"0": {"json": {"id": deck_id}}})
    
    # 2. URL-encode the payload for safe insertion into the query string
    encoded_input = quote(input_payload)

    # 3. Construct the full API URL
    api_url = (
        "https://curiosa.io/api/trpc/deck.getDecklistById?"
        f"batch=1&input={encoded_input}"
    )

    # 4. Execute the API Request
    try:
        # Use standard headers to mimic a web browser and avoid quick blocks
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        
        response = requests.get(api_url, headers=headers, timeout=10)
        response.raise_for_status() # Raise exception for 4xx or 5xx status codes
        raw_response = response.json()
        
    except requests.exceptions.RequestException as e:
        print(f"API Request failed for {deck_id}: {e}")
        return []
    # 5. Parse the Decklist from the tRPC Response
    decklist = []
    try:
        # Navigate the nested JSON structure to get the list of card objects:
        decklist_entries = raw_response[0]['result']['data']['json']['decklist']
        
        for entry in decklist_entries:
            # Check if the card object is present and not null
            card_info = entry.get('card')
            quantity = entry.get('quantity', 0)
            
            if card_info and quantity > 0:
                name = card_info.get('name', '').strip()
                
                if name:
                    decklist.append({
                        'name': name, 
                        'quantity': quantity
                    })
                
    except (KeyError, IndexError, TypeError) as e:
        print(f"ERROR: Failed to parse decklist structure from response: {e}")
        # Print the problematic response portion to debug if this fails again
        print(json.dumps(raw_response[0], indent=2)[:500]) 
        return []

    return decklist

# --- Flask App Initialization ---
app = Flask(__name__)
CORS(app) 
load_card_db()


# --- Health Check / Root Route ---

@app.route('/', methods=['GET'])
def home():
    """Provides a health check and verifies data loaded correctly."""
    return jsonify({
        "status": "Service Operational",
        "version": VERSION,
        "cards_loaded": len(CARD_DB),
        "api_ready": len(CARD_DB) > 0 
    })


# --- Primary API Endpoint (Phase 2.2 Implementation) ---

@app.route('/api/generate-proxies', methods=['POST'])
def generate_proxies_endpoint():
    """
    Handles file upload, decklink, parsing, and triggers proxy generation.
    """
    if len(CARD_DB) == 0:
        return jsonify({"error": "Service is initializing or card data failed to load."}), 503

    user_owned_collection = []
    deck_list = []
    
    # 1. Handle Curiosa Collection Export (File Upload)
    if 'curiosa_export' in request.files:
        file = request.files['curiosa_export']
        
        # Read the file stream as text, ensuring UTF-8 decoding
        try:
            file_stream = io.StringIO(file.read().decode('utf-8'))
            user_owned_collection = parse_curiosa_export(file_stream)
            print(f"Parsed collection: {len(user_owned_collection)} unique cards found.")
        except UnicodeDecodeError:
            return jsonify({"error": "Could not decode file. Ensure it is a valid UTF-8 CSV."}), 400
        
    else:
        # Require the collection file for the app to function
        return jsonify({"error": "Missing required 'curiosa_export' file upload."}), 400
        
    # 2. Handle Deck Import Link (Form Data)
    deck_url = request.form.get('deck_link', '').strip()
    if deck_url:
        deck_list = resolve_decklist_from_url(deck_url)
        print(f"Resolved decklist: {len(deck_list)} unique cards found.")
        
    # --- Data Enrichment & Matching (Task 2.2.4 - 2.2.6) GOES HERE ---
    
    # Placeholder response to confirm input handling is working
    return jsonify({
        "status": "Inputs parsed successfully.",
        "owned_cards_count": sum(c['quantity'] for c in user_owned_collection),
        "decklist_cards_count": sum(c['quantity'] for c in deck_list),
        "next_step": "Implement Data Enrichment and Matching (Task 2.2.4)"
    }), 200

# Vercel requires the app instance to be exported