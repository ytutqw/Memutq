from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.dependencies import get_current_user
from app.models.models import User, Deck, Card
from app.schemas.schemas import CardCreate, CardUpdate, CardResponse

router = APIRouter(tags=["cards"])


@router.post("/decks/{deck_id}/cards", response_model=CardResponse, status_code=201)
async def create_card(
    deck_id: int,
    body: CardCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Убеждаемся что колода принадлежит пользователю
    result = await db.execute(
        select(Deck).where(Deck.id == deck_id, Deck.user_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Deck not found")

    card = Card(deck_id=deck_id, front=body.front, back=body.back)
    db.add(card)
    await db.commit()
    await db.refresh(card)
    return card


@router.put("/cards/{card_id}", response_model=CardResponse)
async def update_card(
    card_id: int,
    body: CardUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Загружаем карточку с её колодой для проверки владельца
    result = await db.execute(
        select(Card).join(Deck).where(
            Card.id == card_id,
            Deck.user_id == current_user.id,
        )
    )
    card = result.scalar_one_or_none()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    if body.front is not None:
        card.front = body.front
    if body.back is not None:
        card.back = body.back

    await db.commit()
    await db.refresh(card)
    return card


@router.delete("/cards/{card_id}", status_code=204)
async def delete_card(
    card_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Card).join(Deck).where(
            Card.id == card_id,
            Deck.user_id == current_user.id,
        )
    )
    card = result.scalar_one_or_none()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    await db.delete(card)
    await db.commit()
