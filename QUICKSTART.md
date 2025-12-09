# 🚀 Quick Start Guide

## The Issue You Hit

**NetworkError when attempting to fetch resource** means the frontend can't connect to the backend. This happens when:
- Backend (Flask) isn't running
- Frontend uses wrong port/URL
- CORS issues

**We've fixed this!** ✅

---

## Two Ways to Start

### Option 1: Automatic (Recommended)
```bash
cd /Users/james/Library/Mobile\ Documents/com~apple~CloudDocs/2\ Personal/SorceryWebApp
./start.sh
```

This starts both backend and frontend automatically.

### Option 2: Manual (Two Terminal Windows)

**Terminal 1 - Backend:**
```bash
cd /Users/james/Library/Mobile\ Documents/com~apple~CloudDocs/2\ Personal/SorceryWebApp
source .venv/bin/activate
python3 -m flask --app api.index run
```

Expected output:
```
* Running on http://127.0.0.1:5000
```

**Terminal 2 - Frontend:**
```bash
cd /Users/james/Library/Mobile\ Documents/com~apple~CloudDocs/2\ Personal/SorceryWebApp/frontend
npm run dev
```

Expected output:
```
➜  Local:   http://localhost:5173/
```

---

## What We Fixed

1. ✅ **Vite Proxy** - Frontend now proxies `/api/*` to Flask backend
2. ✅ **API URL** - Changed from `http://localhost:3000` → `/api` (uses proxy)
3. ✅ **Flask Port** - Now running on `5000` (Flask default) instead of `3000`
4. ✅ **CORS** - Already enabled in backend

---

## Test It Works

1. Open http://localhost:5173 in browser
2. Upload a Curiosa CSV collection file
3. Enter a deck URL (e.g., https://curiosa.io/decks/view/...)
4. Click "Generate Proxies"
5. Should see your deck cards load!

---

## Troubleshooting

**"Port already in use" error?**
```bash
# Find what's using the port
lsof -i :5000        # Backend
lsof -i :5173        # Frontend

# Kill it
kill -9 <PID>
```

**Still getting NetworkError?**
- Check backend console for errors
- Verify `http://localhost:5000/` works in browser
- Check browser console (F12) for detailed error message

**Can't see Flask output?**
- Make sure you're in the project root
- Run `python3 -m flask --app api.index run` (not just `flask run`)

---

## Production Deployment

When deploying to Vercel:
1. Update `VITE_API_URL` in `.env.production` to your Vercel backend URL
2. Frontend builds to `/frontend/dist`
3. Backend deploys as serverless functions

See `SETUP.md` for details.
