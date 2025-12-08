🛠️ Phase 1: Project Setup & Core Data
1.1 Project & Environment Setup
Task	Details
1.1.1	Initialize a Git repository for version control.
1.1.2	Set up a Python Virtual Environment (venv).
1.1.3	Install core dependencies: Flask, Pillow, ReportLab, requests (for image download).
1.1.4	Create requirements.txt listing all dependencies for Vercel.
1.1.5	Define the basic file structure (e.g., api/index.py for Flask app, card_data/, public/).
1.1.6	Create a basic vercel.json file to configure Vercel for the Python runtime, ensuring required directories are included (see 1.3.3).
1.2 Master Card Data Acquisition
Task	Details
1.2.1	Create the Master Card Data JSON: Compile all ~1000 Sorcery card details (name, cost, rarity, set, etc.) into a static file (e.g., card_data/master_cards.json).
1.2.2	Image Acquisition Script: Write a one-time Python script that iterates through the JSON and uses requests to download the high-resolution image for every card from the external source.
1.2.3	Image Storage: Store all downloaded images in a local directory (e.g., card_data/images/). CRITICAL: Ensure the final deployment package size (under 250MB for Vercel Functions) can accommodate all images.
1.3 Flask Server & Deployment Configuration
Task	Details
1.3.1	Instantiate Flask: Create the main Flask application instance in api/index.py.
1.3.2	Load Master Data: Implement logic to load the master_cards.json into memory (a Python dictionary/object) when the Flask app starts.
1.3.3	Vercel File Inclusion: Update vercel.json to use the includeFiles property to ensure the entire card_data/ directory (JSON and images) is packaged and deployed with the Serverless Function.
💻 Phase 2: Backend Logic (Stateless API)
2.1 API Endpoint Definition
Task	Details
2.1.1	Define a single POST route (e.g., @app.route('/api/generate-proxies', methods=['POST'])) to handle the file upload and proxy request.
2.1.2	Implement CORS headers to allow the frontend to safely call the API endpoint.
2.2 Input Handling & Validation
Task	Details
2.2.1	Receive Curiosa Export: Use flask.request.files to securely receive the uploaded Curiosa collection export file.
2.2.2	File Validation: Implement checks for file size (MAX_CONTENT_LENGTH config) and file extension/type.
2.2.3	Curiosa Parsing: Write a dedicated function to read the uploaded file's content (text/CSV) and parse it into a structured list of cards and quantities.
2.3 Collection & Deck Matching
Task	Details
2.3.1	Data Enrichment: Match the parsed card names to the in-memory Master Card Data to retrieve rarity, set, image path, etc.
2.3.2	Decklist Integration: Process the decklist input (provided either as a separate upload or text field) and determine the list of cards that need proxies (owned card in deck → IOU needed).
2.3.3	Filtering Logic: Implement the selection logic based on client-provided parameters (e.g., proxy_rarity='unique', proxy_price_cutoff='50').
🖼️ Phase 3: Image & PDF Generation
3.1 IOU Proxy Image Manipulation
Task	Details
3.1.1	Image Helper Function: Create a function that takes a card name and a deck name (iou_tag) and performs the following using Pillow:
3.1.2	Load Image: Load the corresponding master card image from the local card_data/images/ directory.
3.1.3	Overlay IOU Tag: Draw a distinctive, non-obnoxious IOU graphic/text and the provided iou_tag (deck name) onto the card image.
3.1.4	In-Memory Buffer: Save the manipulated image into an io.BytesIO buffer (not to the server disk) to maintain statelessness.
3.2 PDF Assembly and Output
Task	Details
3.2.1	ReportLab Setup: Initialize a ReportLab document instance, pointing it to an overall io.BytesIO buffer for the final PDF output.
3.2.2	Layout Logic: Implement logic to arrange the generated IOU images onto standard paper size (e.g., 9-up layout for proxy sheets).
3.2.3	Final Stream: Build the PDF document using the list of manipulated IOU images from the previous step.
3.2.4	Return File: Use flask.send_file to stream the PDF buffer's content back to the client with the correct application/pdf Content-Type and Content-Disposition headers for download.
🖥️ Phase 4: Frontend & Deployment
4.1 Frontend Development
Task	Details
4.1.1	Setup: Choose and set up a lightweight frontend framework (e.g., plain JS/HTML or a simple React/Vue scaffold).
4.1.2	Input UI: Build the user interface for: 1. Curiosa export file upload, 2. Decklist input, 3. Filtering options (rarity, price, etc.).
4.1.3	API Integration: Write JavaScript to submit the form data (using FormData for file uploads) to the Flask API endpoint and handle the download of the returned PDF file.
4.2 Testing & Deployment
Task	Details
4.2.1	Local Testing: Test the full loop (frontend → Flask → PDF) locally using vercel dev or the Flask development server.
4.2.2	Unit/Integration Tests: Write tests for the core logic (e.g., data enrichment, IOU filtering).
4.2.3	Vercel Deployment: Deploy to Vercel via Git integration or the Vercel CLI (vercel --prod).
4.2.4	Final Checks: Verify that the application scales correctly, processing requests quickly and not encountering Vercel's serverless function memory or time limits.