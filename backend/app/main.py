from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, decks, cards, study

app = FastAPI(
    title="Memutq API",
    description="Веб-приложение для интервального повторения (SM-2)",
    version="1.0.0",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Роутеры ───────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(decks.router)
app.include_router(cards.router)
app.include_router(study.router)


@app.get("/", tags=["health"])
async def root():
    return {"status": "ok", "app": "Memutq API"}
