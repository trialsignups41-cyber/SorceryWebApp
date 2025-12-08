import json
import os
import io
import csv
import requests
import re #For Regex matching the deck ID
from urllib.parse import quote #for safe url encoding
import uuid

#PDF generation imports
from PIL import Image, ImageDraw, ImageFont # Pillow for image manipulation
from fpdf import FPDF # <--- NEW IMPORT
from io import BytesIO


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
        # Enhanced headers to mimic a detailed browser session and bypass WAF/CSRF checks
        headers = {
            # General headers
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Referer": "https://curiosa.io/",
            "Origin": "https://curiosa.io",
                
            # CRITICAL: Headers WAFs often check for AJAX/data requests
            "Accept": "*/*",
            "Accept-Language": "en-US,en;q=0.9",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Dest": "empty"
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
        # 1. Access the first (and only) element of the list response: raw_response[0]
        # 2. Navigate the nested keys to get the list of card entries (the value of 'json'):
        decklist_entries = raw_response[0]['result']['data']['json'] 
        
        # Ensure the result is actually a list before iterating (it should be)
        if not isinstance(decklist_entries, list):
            print("ERROR: Decklist data found but is not a list. Skipping.")
            return []

        for entry in decklist_entries:
            # The structure of each entry is: {id: ..., quantity: X, card: {name: Y, ...}}
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
        # The KeyError/TypeError catch handles cases where 'result', 'data', or 'json' are missing/corrupt
        print(f"CRITICAL ERROR: Final decklist parsing failed with KeyError/TypeError: {e}")
        # Print the response header for quick inspection of why navigation failed
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

# --- Data Enrichment & Matching (Task 2.2.4 - 2.2.5) ---

def enrich_and_match_data(decklist: list, owned_collection: list, card_db: dict) -> list:
    """
    Combines the decklist, user's collection, and master metadata to calculate 
    net status and enrich the decklist for the UI.
    
    Returns a list of enriched deck cards.
    """
    
    # 1. Convert Owned Collection to a dictionary for O(1) lookup efficiency
    owned_quantities = {card['name']: card['quantity'] for card in owned_collection}
    
    enriched_decklist = []
    
    # 2. Iterate through the target decklist and perform matching
    for deck_card in decklist:
        card_name = deck_card['name']
        required_quantity = deck_card['quantity']
        
        # Get master card metadata (S3 URL, Rarity, Price)
        master_data = card_db.get(card_name)
        
        # Determine owned quantity
        owned_quantity = owned_quantities.get(card_name, 0)
        
        # Calculate net status
        net_needed = required_quantity - owned_quantity
        
        # --- REVISED STATUS LOGIC ---
        final_status = 'Error_NotFound' # Default to error if not found in DB
        
        if master_data:
            # Card exists in the master database (DB)
            if net_needed <= 0:
                final_status = 'Complete' 
            elif owned_quantity > 0:
                final_status = 'Proxy_Needed' # Own some, but need more for this deck
            else:
                final_status = 'Missing' # Own none, need some/all
        # ---------------------------
        
        # 3. Create the enriched object
        enriched_card = {
            'name': card_name,
            'required_quantity': required_quantity,
            'owned_quantity': owned_quantity,
            'net_needed_quantity': max(0, net_needed), 
            'status': final_status,
        }
        
        if master_data:
            # Add all essential master data for filtering and image fetching
            enriched_card.update({
                'image_url': master_data.get('image_url'),
                'rarity': master_data.get('rarity'),
                'price_usd': master_data.get('price_usd'),
                'mana_cost': master_data.get('mana_cost'),
                'slug': master_data.get('image_file', '').replace('.png', '') 
            })
            
        enriched_decklist.append(enriched_card)
        
    return enriched_decklist

def fetch_and_tag_image(image_url: str, tag_text: str, card_db: dict) -> str | None:
    """Fetches image, applies IOU tag, and saves to /tmp as a unique file path."""
    
    # 1. Generate unique temporary path
    temp_filename = os.path.join('/tmp', f"{uuid.uuid4()}.png")

    try:
        # Fetch Image
        img_response = requests.get(image_url, stream=True, timeout=10)
        img_response.raise_for_status()

        # Load image into Pillow
        img = Image.open(io.BytesIO(img_response.content))
        
        # --- Apply IOU Tag (Simplified Pillow Logic) ---
        draw = ImageDraw.Draw(img)
        
        # Placeholder Font (ensure a standard font name is used)
        try:
            # We use a simple path for a standard font
            font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 40)
        except IOError:
            font = ImageFont.load_default()
            
        # Draw text onto the image
        draw.text((10, img.height - 50), tag_text, fill=(255, 0, 0, 255), font=font) # Red tag
        
        # Save to temporary file
        img.save(temp_filename, format="PNG")
        
        return temp_filename
        
    except requests.exceptions.RequestException as e:
        print(f"Failed to fetch image: {e}")
    except Exception as e:
        print(f"Pillow/Saving error: {e}")
        
    return None

# --- PDF & Image Generation (Final FPDF Logic) ---

def create_pdf_from_cards(card_list_to_print: list, deck_name: str, card_db: dict) -> io.BytesIO:
    """
    Fetches images, applies IOU tags via Pillow, and generates a print-ready PDF via FPDF.
    """
    
    # FPDF Setup (Standard US Letter size, Portrait)
    pdf = FPDF(orientation="P", unit="mm", format="Letter")
    
    # Define Card Layout Constants (in mm)
    CARD_WIDTH_MM, CARD_HEIGHT_MM = 63, 88
    MARGIN_X, MARGIN_Y = 10, 10
    COLS, ROWS = 3, 3 # 3 columns x 3 rows per page = 9 cards per page
    SPACING = 0.5 # Small spacing between cards in mm

    # List to hold temporary file paths for cleanup
    temp_files_to_cleanup = []
    
    pdf.add_page()
    x_pos, y_pos = MARGIN_X, MARGIN_Y
    card_counter = 0
    
    # 1. Image Processing and Drawing
    for card_entry in card_list_to_print:
        name = card_entry['name']
        quantity_to_print = card_entry['quantity']
        
        master_data = card_db.get(name, {})
        image_url = master_data.get('image_url')
        
        if not image_url:
            print(f"Skipping card '{name}': Image URL not found.")
            continue
            
        # 2. Fetch Image and Apply IOU Tag ONCE
        tag_text = f"IOU | {deck_name}"
        
        try:
            # Fetch Image
            img_data = requests.get(image_url, timeout=20).content
            img = Image.open(BytesIO(img_data)).convert("RGB")
            
            # Apply IOU Tag (Pillow Logic)
            draw = ImageDraw.Draw(img)
            # Use a safe, standard font and draw a visible red tag
            try:
                font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 40)
            except IOError:
                font = ImageFont.load_default()
            
            # Draw text near the bottom left
            draw.text((10, img.height - 70), tag_text, fill=(255, 0, 0, 255), font=font) 
            
            # Resize for printing standard TCG size (300 DPI conversion)
            img_resized = img.resize(
                (int(CARD_WIDTH_MM / 25.4 * 300), int(CARD_HEIGHT_MM / 25.4 * 300))
            )
            
            # Save the processed image to a temporary file path
            temp_path = os.path.join('/tmp', f"{uuid.uuid4()}_{name}.png")
            img_resized.save(temp_path, "PNG")
            temp_files_to_cleanup.append(temp_path)
            
        except Exception as e:
            print(f"Error processing image for {name}: {e}")
            continue # Skip to next card if processing fails


        # 3. Add to PDF based on quantity
        for i in range(quantity_to_print):
            
            # Check for page break (after 9 cards)
            if card_counter > 0 and card_counter % (COLS * ROWS) == 0:
                pdf.add_page()
                x_pos, y_pos = MARGIN_X, MARGIN_Y
            
            # Draw the image using the file path string (FPDF requirement)
            pdf.image(temp_path, x_pos, y_pos, CARD_WIDTH_MM, CARD_HEIGHT_MM)

            # Move cursor to the next column
            x_pos += CARD_WIDTH_MM + SPACING
            
            # Check if we finished a row
            if (card_counter + 1) % COLS == 0:
                x_pos = MARGIN_X
                y_pos += CARD_HEIGHT_MM + SPACING
                
            card_counter += 1

    # 4. Final Output and Cleanup
    
    # Save PDF output to the in-memory buffer
    pdf_output_buffer = BytesIO()
    pdf.output(pdf_output_buffer)
    pdf_output_buffer.seek(0)
    
    # Clean up all temporary files
    for temp_path in temp_files_to_cleanup:
        try:
            os.remove(temp_path)
        except OSError:
            pass 

    return pdf_output_buffer

# --- Primary API Endpoint (Phase 2.2 Implementation) ---
# --- PDF Generation Endpoint (Task 3.1.1 - 3.4.1) ---

@app.route('/api/print-bucket', methods=['POST'])
def print_bucket_endpoint():
    """
    Receives a final list of cards to print and streams the PDF file.
    """
    if len(CARD_DB) == 0:
        return jsonify({"error": "Service is down or data failed to load."}), 503

    try:
        # Expect the frontend to send a JSON body containing the list of cards and the deck name
        data = request.get_json()
        
        cards_to_print = data.get('cards', []) # List of {'name': 'X', 'quantity': Y}
        deck_name = data.get('deck_name', 'Proxy Deck')
        
        if not cards_to_print:
            return jsonify({"error": "No cards provided for printing."}), 400

        # Generate the PDF buffer
        pdf_buffer = create_pdf_from_cards(cards_to_print, deck_name, CARD_DB)

        # 4. Stream the PDF back to the client (Task 3.4.1)
        return send_file(
            pdf_buffer,
            as_attachment=True,
            download_name=f"{deck_name}_Proxy_Sheet.pdf",
            mimetype='application/pdf'
        )
        
    except Exception as e:
        print(f"Error during PDF generation: {e}")
        return jsonify({"error": f"An error occurred during PDF processing: {e}"}), 500

@app.route('/api/generate-proxies', methods=['POST'])
def generate_proxies_endpoint():
    """
    Handles file upload, decklink, parsing, and performs data matching/enrichment.
    """
    if len(CARD_DB) == 0:
        return jsonify({"error": "Service is initializing or card data failed to load."}), 503

    user_owned_collection = []
    deck_list = []
    
    # 1. Handle Curiosa Collection Export (File Upload)
    if 'curiosa_export' in request.files:
        file = request.files['curiosa_export']
        try:
            file_stream = io.StringIO(file.read().decode('utf-8'))
            user_owned_collection = parse_curiosa_export(file_stream)
        except UnicodeDecodeError:
            return jsonify({"error": "Could not decode collection file. Ensure it is a valid UTF-8 CSV."}), 400
    
    # Require collection data to proceed, as proxies depend on ownership
    if not user_owned_collection:
         return jsonify({"error": "Collection data is missing or empty. Please upload your Curiosa export."}), 400
        
    # 2. Handle Deck Import Link (Form Data)
    deck_url = request.form.get('deck_link', '').strip()
    if deck_url:
        deck_list = resolve_decklist_from_url(deck_url)
    
    # Require a resolved decklist to proceed
    if not deck_list:
        return jsonify({"error": "Decklink could not be resolved or the decklist is empty."}), 400
        
    # 3. Data Enrichment and Matching (Task 2.2.4 - 2.2.5)
    final_enriched_deck = enrich_and_match_data(deck_list, user_owned_collection, CARD_DB)
    
    print(f"Enrichment Complete. Returned {len(final_enriched_deck)} deck entries with status.")
    
    # 4. Return the enriched data to the Frontend UI (Phase 4.2.2)
    # The Frontend will use this data to populate the interactive editor.
    return jsonify({
        "status": "Success",
        "message": "Deck enrichment and ownership calculation complete.",
        "decklist": final_enriched_deck,
        "next_step": "Frontend UI or Proxy Filtering (Task 2.2.6)"
    }), 200

# Vercel requires the app instance to be exported