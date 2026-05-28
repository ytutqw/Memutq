from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user
from app.models.models import User, Deck
from app.schemas.schemas import DeckCreate, DeckUpdate, DeckResponse, DeckWithCards

router = APIRouter(prefix="/decks", tags=["decks"])


@router.get("", response_model=list[DeckResponse])
async def get_decks(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Deck).where(Deck.user_id == current_user.id).order_by(Deck.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=DeckResponse, status_code=201)
async def create_deck(
    body: DeckCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    deck = Deck(user_id=current_user.id, title=body.title, description=body.description)
    db.add(deck)
    await db.commit()
    await db.refresh(deck)
    return deck


@router.get("/{deck_id}", response_model=DeckWithCards)
async def get_deck(
    deck_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Deck)
        .options(selectinload(Deck.cards))
        .where(Deck.id == deck_id, Deck.user_id == current_user.id)
    )
    deck = result.scalar_one_or_none()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    return deck


@router.put("/{deck_id}", response_model=DeckResponse)
async def update_deck(
    deck_id: int,
    body: DeckUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Deck).where(Deck.id == deck_id, Deck.user_id == current_user.id)
    )
    deck = result.scalar_one_or_none()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")

    if body.title is not None:
        deck.title = body.title
    if body.description is not None:
        deck.description = body.description

    await db.commit()
    await db.refresh(deck)
    return deck


@router.delete("/{deck_id}", status_code=204)
async def delete_deck(
    deck_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Deck).where(Deck.id == deck_id, Deck.user_id == current_user.id)
    )
    deck = result.scalar_one_or_none()
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")

    await db.delete(deck)
    await db.commit()
