#!/bin/bash
# Quick start script for Sorcery Proxy Tool

set -e

echo "🚀 Starting Sorcery Proxy Tool..."
echo ""

# Get the root directory
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check if we're in the right place
if [ ! -f "$ROOT_DIR/api/index.py" ]; then
    echo "❌ Error: api/index.py not found. Run this from the SorceryWebApp root directory."
    exit 1
fi

echo "📁 Root directory: $ROOT_DIR"
echo ""

# Start Backend
echo "🔧 Starting Flask backend on port 5000..."
cd "$ROOT_DIR"

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv .venv
fi

# Activate virtual environment
source .venv/bin/activate

# Install requirements if needed
if ! python3 -c "import flask" 2>/dev/null; then
    echo "📥 Installing Python dependencies..."
    pip install -r requirements.txt
fi

# Start Flask in background
python3 -m flask --app api.index run &
FLASK_PID=$!
echo "✅ Flask backend started (PID: $FLASK_PID)"
echo ""

# Wait a moment for Flask to start
sleep 2

# Start Frontend
echo "🎨 Starting React frontend on port 5173..."
cd "$ROOT_DIR/frontend"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📥 Installing npm dependencies..."
    npm install
fi

# Start Vite dev server
npm run dev &
VITE_PID=$!
echo "✅ Vite dev server started (PID: $VITE_PID)"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Sorcery Proxy Tool is ready!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📱 Frontend: http://localhost:5173"
echo "⚙️  Backend:  http://localhost:5000"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Keep the script running
wait
