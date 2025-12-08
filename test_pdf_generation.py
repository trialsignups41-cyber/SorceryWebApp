# test_pdf_generation.py
import sys
import os
import json
import io
import datetime

# --- Setup for importing functions from api/index.py ---
# Note: Ensure all dependencies (requests, Pillow, ReportLab) are installed!
sys.path.insert(0, os.path.join(os.getcwd(), 'api'))

# Import the core PDF function and the CARD_DB/load logic
from index import load_card_db, CARD_DB, create_pdf_from_cards

# --- Test Configuration ---
OUTPUT_FILENAME = f"test_output_{datetime.datetime.now().strftime('%Y%m%d_%H%M')}.pdf"

# 1. Define Mock Input (Simulate a bucket of cards the user wants to print)
# We use cards guaranteed to be in your DB (as tested before)
MOCK_PRINT_LIST = [
    # Proxy Needed (Owned 2, Need 3) -> Print 3
    {'name': 'Mesmerism', 'quantity': 3}, 
    # Missing (Owned 0, Need 4) -> Print 4
    {'name': 'Diluvian Kraken', 'quantity': 4}, 
    # Extra card to test page break (Print 2 total of this card)
    {'name': 'Adept Illusionist', 'quantity': 2}, 
]
MOCK_DECK_NAME = "Test Proxy Run"

print("--- Testing PDF Generation and Image Fetching (Phase 3) ---")

# --- 2. Initialization ---
# Load the actual CARD_DB to get the real S3 image URLs
load_card_db()

if not CARD_DB:
    print("\nCRITICAL ERROR: CARD_DB failed to load. Cannot proceed with image fetching test.")
    sys.exit(1)

# --- 3. Execution ---
print(f"\n[EXECUTION] Generating PDF with {sum(c['quantity'] for c in MOCK_PRINT_LIST)} total cards...")
try:
    # Call the worker function directly
    pdf_buffer = create_pdf_from_cards(MOCK_PRINT_LIST, MOCK_DECK_NAME, CARD_DB)
    
    # 4. Verification and File Save
    if pdf_buffer and len(pdf_buffer.getvalue()) > 1024: # Check if the buffer has content (min 1KB size)
        
        # Write the in-memory buffer to a local file for visual inspection
        with open(OUTPUT_FILENAME, 'wb') as f:
            f.write(pdf_buffer.getvalue())
        
        print("\n✅ SUCCESS: PDF generation complete and functional.")
        print(f"File saved successfully! Check your project root for: {OUTPUT_FILENAME}")
        print("Please open the PDF to visually verify images, IOU tags, and layout.")
        
    else:
        print("❌ FAILURE: PDF buffer is empty. Check ReportLab canvas commands or image fetching errors.")
        
except Exception as e:
    print(f"\nCRITICAL FAILURE during PDF process: {e}")