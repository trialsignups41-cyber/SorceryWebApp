import json
import os
import io
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS # Used for cross-origin requests from your frontend

# --- Configuration & Global Variables ---

# Path to the master card data, relative to the project root (where Vercel runs the script)
MASTER_DATA_PATH = 'card_data/master_cards.json'
CARD_DB = {}
VERSION = "1.0.0" # Use this for the health check

# --- Initialization Logic ---

def load_card_db():
    """Loads the static master card data JSON into memory (CARD_DB)."""
    global CARD_DB
    
    # We use os.getcwd() for logging the root, useful for debugging Vercel paths
    print(f"Current working directory: {os.getcwd()}") 
    
    try:
        # Check if the file exists before attempting to open
        if not os.path.exists(MASTER_DATA_PATH):
            print(f"ERROR: Master data file not found at {MASTER_DATA_PATH}")
            return

        with open(MASTER_DATA_PATH, 'r', encoding='utf-8') as f:
            CARD_DB = json.load(f)
        print(f"SUCCESS: Loaded {len(CARD_DB)} unique cards into memory.")
        
        # Simple check for data integrity
        if CARD_DB:
            first_card = next(iter(CARD_DB.values()))
            print(f"Example Card Data Loaded (Name: {first_card.get('name')}, URL: {first_card.get('image_url')})")

    except Exception as e:
        print(f"CRITICAL ERROR: Failed to load card database: {e}")

# Create the Flask application instance
app = Flask(__name__)

# Enable CORS for all routes, allowing your frontend to communicate with the API
CORS(app) 

# Load the data immediately when the serverless function cold-starts
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


# --- Primary API Endpoint (Placeholder for Phase 2) ---

@app.route('/api/generate-proxies', methods=['POST'])
def generate_proxies_endpoint():
    """
    This route will handle the file upload, processing, and PDF generation (Phase 2 & 3).
    """
    if len(CARD_DB) == 0:
        return jsonify({"error": "Service is initializing or card data failed to load."}), 503
        
    # Placeholder for the actual processing logic (to be filled in Phase 2)
    
    # Check for file and JSON data submission
    if 'curiosa_export' not in request.files and 'decklist' not in request.form:
         return jsonify({"error": "Missing required data (Curiosa export and/or decklist)."}), 400
         
    # Dummy response for testing the route until Phase 2 is complete
    return jsonify({
        "status": "Request received and data loaded.",
        "message": "Processing logic (Phase 2 & 3) not yet implemented."
    }), 202

# Vercel requires the app instance to be exported
# The main application logic will be implemented within the generate_proxies_endpoint function.