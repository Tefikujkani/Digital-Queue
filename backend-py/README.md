# SmartQueue Kosova — FastAPI

Zëvendësim 1:1 i backend-it Express. Të njëjtat rrugë `/api/*`, i njëjti MongoDB, i njëjti JWT.

## Nisja lokale

```bash
cd backend-py
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # ose kopjo backend/.env
uvicorn app.main:asgi --host 0.0.0.0 --port 5001 --reload
```

Frontend: `VITE_API_URL=http://localhost:5001/api` dhe `VITE_SOCKET_URL=http://localhost:5001`.

## Deploy

Imazhi Docker: `backend-py/Dockerfile`. Vendos të njëjtat env si `.env.example` (PORT, MONGODB_URI, JWT_SECRET, CLIENT_URL).

WhatsApp Baileys (Node) nuk ekziston këtu — dërgimi bëhet me Green-API ose Meta Cloud API.
