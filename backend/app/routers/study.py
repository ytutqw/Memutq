from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.database import get_db
from app.dependencies import get_current_user
from app.models.models import User, Deck, Card, CardProgress
from app.schemas.schemas import CardResponse, ReviewRequest, ReviewResponse, StatsResponse
from app.services.sm2_service import calculate_next_review

router = APIRouter(prefix="/study", tags=["study"])


@router.get("/{deck_id}/session", response_model=list[CardResponse])
async def get_session(
    deck_id: int,
    force: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Возвращает карточки колоды, у которых next_review <= сегодня."""
    # Проверяем владельца колоды
    deck_result = await db.execute(
        select(Deck).where(Deck.id == deck_id, Deck.user_id == current_user.id)
    )
    if not deck_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Deck not found")

    today = date.today()

    # Карточки с прогрессом, у которых подошла дата
    progress_query = select(Card).join(CardProgress, (CardProgress.card_id == Card.id) & (CardProgress.user_id == current_user.id)).where(Card.deck_id == deck_id)
    if not force:
        progress_query = progress_query.where(CardProgress.next_review <= today)

    result = await db.execute(progress_query)
    cards_with_progress = result.scalars().all()

    # Карточки без прогресса вообще (новые) — тоже включаем
    result2 = await db.execute(
        select(Card)
        .outerjoin(CardProgress, (CardProgress.card_id == Card.id) & (CardProgress.user_id == current_user.id))
        .where(Card.deck_id == deck_id, CardProgress.id == None)
    )
    new_cards = result2.scalars().all()

    return list(cards_with_progress) + list(new_cards)


@router.post("/review", response_model=ReviewResponse)
async def submit_review(
    body: ReviewRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Принимает оценку 0–5, пересчитывает SM-2 и сохраняет прогресс."""
    if not (0 <= body.quality <= 5):
        raise HTTPException(status_code=422, detail="quality must be between 0 and 5")

    # Проверяем что карточка доступна пользователю (через владение колодой)
    card_result = await db.execute(
        select(Card).join(Deck).where(
            Card.id == body.card_id,
            Deck.user_id == current_user.id,
        )
    )
    card = card_result.scalar_one_or_none()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    # Ищем или создаём прогресс
    progress_result = await db.execute(
        select(CardProgress).where(
            CardProgress.card_id == body.card_id,
            CardProgress.user_id == current_user.id,
        )
    )
    progress = progress_result.scalar_one_or_none()

    if not progress:
        progress = CardProgress(
            user_id=current_user.id,
            card_id=body.card_id,
            easiness_factor=2.5,
            interval_days=1,
            repetitions=0,
        )
        db.add(progress)

    # Пересчитываем SM-2
    result = calculate_next_review(
        easiness_factor=progress.easiness_factor,
        interval_days=progress.interval_days,
        repetitions=progress.repetitions,
        quality=body.quality,
    )

    progress.easiness_factor = result.easiness_factor
    progress.interval_days = result.interval_days
    progress.repetitions = result.repetitions
    progress.next_review = result.next_review
    progress.last_reviewed = datetime.utcnow()

    await db.commit()

    return ReviewResponse(
        card_id=body.card_id,
        next_review=result.next_review,
        interval_days=result.interval_days,
        easiness_factor=result.easiness_factor,
    )


@router.get("/stats", response_model=StatsResponse)
async def get_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Статистика: повторено сегодня / ожидает / всего карточек."""
    today = date.today()

    # Повторено сегодня (last_reviewed = сегодня)
    reviewed_result = await db.execute(
        select(func.count(CardProgress.id)).where(
            CardProgress.user_id == current_user.id,
            func.date(CardProgress.last_reviewed) == today,
        )
    )
    reviewed_today = reviewed_result.scalar() or 0

    # Ожидает повторения (next_review <= сегодня)
    pending_result = await db.execute(
        select(func.count(CardProgress.id)).where(
            CardProgress.user_id == current_user.id,
            CardProgress.next_review <= today,
        )
    )
    pending = pending_result.scalar() or 0

    # Всего карточек пользователя
    total_result = await db.execute(
        select(func.count(Card.id))
        .join(Deck)
        .where(Deck.user_id == current_user.id)
    )
    total = total_result.scalar() or 0

    return StatsResponse(reviewed_today=reviewed_today, pending=pending, total=total)
