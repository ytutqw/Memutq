import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.dependencies import get_current_user
from app.models.models import User, Card, Deck

router = APIRouter(tags=["files"])

UPLOAD_DIR = Path("/app/uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
MAX_SIZE = 5 * 1024 * 1024  # 5 MB


@router.post("/cards/{card_id}/upload-image")
async def upload_card_image(
    card_id: int,
    side: str,  # "front" или "back"
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if side not in ("front", "back"):
        raise HTTPException(status_code=422, detail="side должен быть 'front' или 'back'")

    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=422, detail="Разрешены только изображения: JPEG, PNG, GIF, WebP")

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=422, detail="Файл слишком большой, максимум 5 МБ")

    # Проверяем что карточка принадлежит пользователю
    result = await db.execute(
        select(Card).join(Deck).where(
            Card.id == card_id,
            Deck.user_id == current_user.id,
        )
    )
    card = result.scalar_one_or_none()
    if not card:
        raise HTTPException(status_code=404, detail="Карточка не найдена")

    # Удаляем старое изображение если есть
    old_filename = card.front_image if side == "front" else card.back_image
    if old_filename:
        old_path = UPLOAD_DIR / old_filename
        if old_path.exists():
            old_path.unlink()

    # Сохраняем новое
    ext = Path(file.filename).suffix.lower() if file.filename else ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    file_path = UPLOAD_DIR / filename
    file_path.write_bytes(content)

    if side == "front":
        card.front_image = filename
    else:
        card.back_image = filename

    await db.commit()
    return {"filename": filename, "url": f"/files/{filename}"}


@router.delete("/cards/{card_id}/image")
async def delete_card_image(
    card_id: int,
    side: str,
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
        raise HTTPException(status_code=404, detail="Карточка не найдена")

    filename = card.front_image if side == "front" else card.back_image
    if filename:
        file_path = UPLOAD_DIR / filename
        if file_path.exists():
            file_path.unlink()
        if side == "front":
            card.front_image = None
        else:
            card.back_image = None
        await db.commit()

    return {"ok": True}


@router.get("/files/{filename}")
async def get_file(filename: str):
    # Защита от path traversal
    if ".." in filename or "/" in filename:
        raise HTTPException(status_code=400, detail="Недопустимое имя файла")

    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Файл не найден")

    return FileResponse(file_path)