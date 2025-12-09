# Sorcery Proxy Tool - Complete Setup Guide

## Project Overview

This is a full-stack application for generating proxy cards from Sorcery Contested Realm decks.

**Stack:**
- Backend: Python Flask (Vercel-ready)
- Frontend: React + Vite + TailwindCSS
- Hosting: Vercel (free tier)

---

## Quick Start

### 1. Backend Setup (Already Complete ✅)

The backend is in `/api` directory and includes:
- Flask API with CORS support
- Card database integration (1105+ cards)
- Deck fetching from Curiosa
- PDF generation with FPDF
- Endpoints:
  - `POST /api/generate-proxies` - Process collection + deck
  - `POST /api/print-bucket` - Generate PDF

**Test the backend:**
```bash
cd /Users/james/Library/Mobile\ Documents/com~apple~CloudDocs/2\ Personal/SorceryWebApp
python3 test_pdf_generation.py
```

### 2. Frontend Setup

Navigate to the frontend directory and install dependencies:

```bash
cd frontend
npm install
```

**Start development server:**
```bash
npm run dev
```

This starts Vite on `http://localhost:5173` with proxy to backend on `http://localhost:3000`

**For local testing, run the Flask backend in another terminal:**
```bash
cd ..
python3 -m flask --app api.index run
```

Then open `http://localhost:5173` in your browser.

---

## Project Structure

```
SorceryWebApp/
├── api/                    # Backend (Python Flask)
│   ├── index.py           # Main API code
│   └── __pycache__/
│
├── card_data/             # Card database
│   └── master_cards.json  # 1105+ cards with metadata
│
├── frontend/              # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── types/         # TypeScript types
│   │   ├── utils/         # API & utilities
│   │   ├── App.tsx        # Main app
│   │   └── index.css      # Tailwind styles
│   │
│   ├── package.json       # Dependencies
│   ├── vite.config.ts     # Vite config
│   ├── tailwind.config.js # Tailwind config
│   └── README.md          # Frontend docs
│
└── Roadmap.md            # Project roadmap
```

---

## Key Features

### 1. Input Form (Phase 4.2.1) ✅
- Upload Curiosa collection CSV
- Enter deck URL (Curiosa link)
- Specify deck name
- Submits to `/api/generate-proxies`

### 2. Card Display (Phase 4.2.2) ✅
- Grid of all cards with images
- Quantity badges
- Ownership status (Owned/Unowned)
- Rarity labels
- Card names on hover

### 3. Filtering System ✅
- **Rarity filters**: Unique, Elite, Exceptional, Ordinary
- **Ownership filters**: Owned, Unowned
- AND logic (all active filters must match)
- Bulk select matching cards
- Individual checkbox selection

### 4. Card Stacking ✅
- Duplicate cards grouped as stacks
- Mixed ownership cards split into owned/unowned stacks
- Unowned cards get grayscale effect
- Quantity overlay shows count

### 5. Bucket System ✅
- Default buckets: "Owned" and "Unowned"
- Drag-and-drop cards between buckets
- Rename buckets
- Add new buckets (+ button)
- Remove cards from buckets
- Responsive layout (vertical on PC, horizontal on mobile)

### 6. PDF & Export (Phase 4.5.1 & 4.5.2) ✅
- **Print PDF**: Generates proxy sheet via `/api/print-bucket`
- **Export Text**: Saves bucket as plain text decklist

---

## API Integration

### Backend Endpoints

**POST /api/generate-proxies**
- Input: `multipart/form-data`
  - `curiosa_export`: CSV file
  - `deck_link`: Deck URL
  - `deck_name`: Optional deck name
- Output: JSON with enriched decklist

**POST /api/print-bucket**
- Input: JSON
  ```json
  {
    "cards": [{"name": "Card Name", "quantity": 2}],
    "deck_name": "My Deck"
  }
  ```
- Output: PDF file binary stream

---

## Development Notes

### TypeScript Types
All data structures are strongly typed in `src/types/index.ts`:
- `Card` - Single card with status
- `CardStack` - Grouped cards (owned/unowned split)
- `Bucket` - Container for card stacks
- `FilterState` - Active filter toggles

### Utilities
- `cardUtils.ts` - Card stacking, filtering, bulk selection
- `api.ts` - Backend API calls, PDF download handling

### Styling
- TailwindCSS for all styling
- Custom CSS classes in `index.css`
- No external component libraries (kept simple!)

---

## Deployment (Free on Vercel)

### Frontend
```bash
# Build
npm run build

# Deploy to Vercel
vercel deploy
```

### Backend
The backend is already Vercel-ready (uses serverless functions).
Deploy from the root directory:
```bash
vercel deploy
```

**Note:** You'll need to update API_BASE in `frontend/src/utils/api.ts` to point to your Vercel backend URL.

---

## Troubleshooting

### "Cannot find module" errors
```bash
npm install
```

### Backend connection refused
Ensure Flask is running on `http://localhost:3000`:
```bash
python3 -m flask --app api.index run
```

### Images not loading
Check that cards have `image_url` field in enriched response from backend.

### PDF generation fails
Ensure all cards in the print bucket have valid image URLs in the database.

---

## Next Steps

1. **Install dependencies**: `cd frontend && npm install`
2. **Start backend**: `python3 -m flask --app api.index run` (in root)
3. **Start frontend**: `npm run dev` (in frontend dir)
4. **Test workflow**: Upload CSV → Enter deck URL → Build buckets → Print PDF

---

## Support

Refer to `README.md` files in each directory for more details.
