# Sorcery Proxy Tool - Frontend

React + Vite frontend for the Sorcery Proxy Tool deck management system.

## Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm build

# Preview production build
npm run preview
```

## Features

- **Input Form**: Upload Curiosa collection CSV and deck URL
- **Card Grid**: Browse and manage cards with drag-and-drop
- **Filtering**: Multi-filter system (Rarity + Ownership)
- **Buckets**: Dynamic bucket system for organizing cards
- **PDF Generation**: Export selected cards as proxy sheet PDF
- **Text Export**: Export bucket as text decklist

## Project Structure

```
src/
├── components/        # React components
├── types/            # TypeScript type definitions
├── utils/            # API calls and utilities
├── App.tsx           # Main app component
├── main.tsx          # Entry point
└── index.css         # Global styles
```

## API Integration

The frontend connects to the backend API endpoints:
- `POST /api/generate-proxies` - Process deck and collection
- `POST /api/print-bucket` - Generate PDF from selected cards

Ensure the backend is running on `http://localhost:3000`
