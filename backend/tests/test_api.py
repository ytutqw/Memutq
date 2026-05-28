"""
Интеграционные тесты API.
Используют in-memory SQLite через conftest.py.
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient


# ── helpers ───────────────────────────────────────────────────────────────────

async def register_and_login(client: AsyncClient, email: str, password: str = "testpass123") -> str:
    """Регистрирует пользователя и возвращает JWT-токен."""
    await client.post("/auth/register", json={
        "email": email,
        "username": email.split("@")[0],
        "password": password,
    })
    resp = await client.post("/auth/login", json={"email": email, "password": password})
    return resp.json()["access_token"]


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ── Auth ──────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_register_success(client: AsyncClient):
    resp = await client.post("/auth/register", json={
        "email": "new@test.com",
        "username": "newuser",
        "password": "password123",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == "new@test.com"
    assert "hashed_password" not in data


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    payload = {"email": "dup@test.com", "username": "dup1", "password": "pass"}
    await client.post("/auth/register", json=payload)
    resp = await client.post("/auth/register", json={**payload, "username": "dup2"})
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    await client.post("/auth/register", json={
        "email": "login@test.com", "username": "loginuser", "password": "pass123"
    })
    resp = await client.post("/auth/login", json={"email": "login@test.com", "password": "pass123"})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    await client.post("/auth/register", json={
        "email": "wp@test.com", "username": "wpuser", "password": "correct"
    })
    resp = await client.post("/auth/login", json={"email": "wp@test.com", "password": "wrong"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_get_me(client: AsyncClient):
    token = await register_and_login(client, "me@test.com")
    resp = await client.get("/auth/me", headers=auth_headers(token))
    assert resp.status_code == 200
    assert resp.json()["email"] == "me@test.com"


@pytest.mark.asyncio
async def test_protected_route_without_token(client: AsyncClient):
    resp = await client.get("/decks")
    assert resp.status_code == 403


# ── Decks ─────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_deck(client: AsyncClient):
    token = await register_and_login(client, "deck@test.com")
    resp = await client.post("/decks", json={"title": "Python basics"}, headers=auth_headers(token))
    assert resp.status_code == 201
    assert resp.json()["title"] == "Python basics"


@pytest.mark.asyncio
async def test_list_decks(client: AsyncClient):
    token = await register_and_login(client, "list@test.com")
    h = auth_headers(token)
    await client.post("/decks", json={"title": "Deck A"}, headers=h)
    await client.post("/decks", json={"title": "Deck B"}, headers=h)
    resp = await client.get("/decks", headers=h)
    assert resp.status_code == 200
    assert len(resp.json()) == 2


@pytest.mark.asyncio
async def test_deck_isolation(client: AsyncClient):
    """Пользователь не видит чужие колоды."""
    t1 = await register_and_login(client, "user1@test.com")
    t2 = await register_and_login(client, "user2@test.com")
    await client.post("/decks", json={"title": "User1 deck"}, headers=auth_headers(t1))
    resp = await client.get("/decks", headers=auth_headers(t2))
    assert resp.status_code == 200
    assert len(resp.json()) == 0


@pytest.mark.asyncio
async def test_update_deck(client: AsyncClient):
    token = await register_and_login(client, "upd@test.com")
    h = auth_headers(token)
    deck = (await client.post("/decks", json={"title": "Old"}, headers=h)).json()
    resp = await client.put(f"/decks/{deck['id']}", json={"title": "New"}, headers=h)
    assert resp.status_code == 200
    assert resp.json()["title"] == "New"


@pytest.mark.asyncio
async def test_delete_deck(client: AsyncClient):
    token = await register_and_login(client, "del@test.com")
    h = auth_headers(token)
    deck = (await client.post("/decks", json={"title": "To delete"}, headers=h)).json()
    resp = await client.delete(f"/decks/{deck['id']}", headers=h)
    assert resp.status_code == 204
    resp2 = await client.get(f"/decks/{deck['id']}", headers=h)
    assert resp2.status_code == 404


# ── Cards ─────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_card(client: AsyncClient):
    token = await register_and_login(client, "card@test.com")
    h = auth_headers(token)
    deck = (await client.post("/decks", json={"title": "Cards deck"}, headers=h)).json()
    resp = await client.post(
        f"/decks/{deck['id']}/cards",
        json={"front": "What is Python?", "back": "A programming language"},
        headers=h,
    )
    assert resp.status_code == 201
    assert resp.json()["front"] == "What is Python?"


@pytest.mark.asyncio
async def test_delete_card(client: AsyncClient):
    token = await register_and_login(client, "delcard@test.com")
    h = auth_headers(token)
    deck = (await client.post("/decks", json={"title": "D"}, headers=h)).json()
    card = (await client.post(f"/decks/{deck['id']}/cards",
        json={"front": "Q", "back": "A"}, headers=h)).json()
    resp = await client.delete(f"/cards/{card['id']}", headers=h)
    assert resp.status_code == 204


# ── Study ─────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_study_session(client: AsyncClient):
    token = await register_and_login(client, "study@test.com")
    h = auth_headers(token)
    deck = (await client.post("/decks", json={"title": "Study deck"}, headers=h)).json()
    await client.post(f"/decks/{deck['id']}/cards",
        json={"front": "Q1", "back": "A1"}, headers=h)
    resp = await client.get(f"/study/{deck['id']}/session", headers=h)
    assert resp.status_code == 200
    assert len(resp.json()) == 1


@pytest.mark.asyncio
async def test_submit_review(client: AsyncClient):
    token = await register_and_login(client, "review@test.com")
    h = auth_headers(token)
    deck = (await client.post("/decks", json={"title": "Review deck"}, headers=h)).json()
    card = (await client.post(f"/decks/{deck['id']}/cards",
        json={"front": "Q", "back": "A"}, headers=h)).json()
    resp = await client.post("/study/review",
        json={"card_id": card["id"], "quality": 4}, headers=h)
    assert resp.status_code == 200
    data = resp.json()
    assert "next_review" in data
    assert "interval_days" in data


@pytest.mark.asyncio
async def test_invalid_quality(client: AsyncClient):
    token = await register_and_login(client, "badq@test.com")
    h = auth_headers(token)
    deck = (await client.post("/decks", json={"title": "D"}, headers=h)).json()
    card = (await client.post(f"/decks/{deck['id']}/cards",
        json={"front": "Q", "back": "A"}, headers=h)).json()
    resp = await client.post("/study/review",
        json={"card_id": card["id"], "quality": 9}, headers=h)
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_stats(client: AsyncClient):
    token = await register_and_login(client, "stats@test.com")
    h = auth_headers(token)
    resp = await client.get("/study/stats", headers=h)
    assert resp.status_code == 200
    data = resp.json()
    assert "reviewed_today" in data
    assert "pending" in data
    assert "total" in data
