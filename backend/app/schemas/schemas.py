from datetime import datetime, date
from pydantic import BaseModel, EmailStr


# ── Auth ──────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    username: str
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Decks ─────────────────────────────────────────────────────────────────────

class DeckCreate(BaseModel):
    title: str
    description: str | None = None
    is_public: bool = False


class DeckUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    is_public: bool | None = None


class DeckResponse(BaseModel):
    id: int
    title: str
    description: str | None
    is_public: bool
    share_token: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Cards ─────────────────────────────────────────────────────────────────────

class CardCreate(BaseModel):
    front: str
    back: str


class CardUpdate(BaseModel):
    front: str | None = None
    back: str | None = None


class CardResponse(BaseModel):
    id: int
    deck_id: int
    front: str
    back: str
    front_image: str | None
    back_image: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class DeckWithCards(DeckResponse):
    cards: list[CardResponse] = []


# ── Study ─────────────────────────────────────────────────────────────────────

class ReviewRequest(BaseModel):
    card_id: int
    quality: int  # 0–5


class ReviewResponse(BaseModel):
    card_id: int
    next_review: date
    interval_days: int
    easiness_factor: float


class StatsResponse(BaseModel):
    reviewed_today: int
    pending: int
    total: int