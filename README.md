# Sorcery Playtest Card Tool

A web application for organizing and printing Sorcery: Contested Realm playtest cards.

## Features

- Import deck lists from Sorcery TCG
- Track owned vs. unowned cards using Curiosa collection exports
- Organize cards into custom buckets for printing
- Generate PDF sheets for printing proxies
- Export deck lists as text
- Buy cards directly from TCGPlayer
- Dark mode support

## Deployment on Vercel

### Prerequisites

1. A GitHub account
2. A Vercel account (free tier)

### Steps

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Deploy on Vercel**
   - Go to [vercel.com](https://vercel.com) and sign in
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel will auto-detect settings from `vercel.json`
   - Click "Deploy"

3. **Done!**
   - Your app will be live at `your-app-name.vercel.app`
   - Automatic deployments on every push to main branch
   - Free SSL certificate included

## Local Development

### Requirements

- Node.js 18+
- Python 3.9+

### Setup

```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies (from root)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Running Locally

```bash
# Start both frontend and backend
./start.sh

# Or manually:
# Terminal 1 - Backend
source venv/bin/activate
python api/index.py

# Terminal 2 - Frontend
cd frontend
npm run dev
```

The app will be available at `http://localhost:5173`

## Project Structure

```
├── api/                    # Python Flask backend
│   └── index.py           # Main API endpoints
├── frontend/              # React + Vite frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── utils/         # API calls and utilities
│   │   └── types.ts       # TypeScript types
│   └── public/
├── card_data/             # Card database
│   └── master_cards.json  # Card information and image URLs
├── vercel.json            # Vercel deployment config
├── requirements.txt       # Python dependencies
└── package.json           # Build configuration
```

## Tech Stack

**Frontend:**
- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Beautiful DnD

**Backend:**
- Python 3.9+
- Flask
- ReportLab (PDF generation)
- Requests

**Deployment:**
- Vercel (Frontend + Serverless Functions)
