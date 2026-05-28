"""
Unit-тесты auth_service: хэширование паролей и JWT.
"""
import pytest
from app.services.auth_service import (
    hash_password, verify_password,
    create_access_token, decode_access_token,
)


class TestPasswordHashing:

    def test_hash_is_not_plaintext(self):
        hashed = hash_password("secret123")
        assert hashed != "secret123"

    def test_correct_password_verifies(self):
        hashed = hash_password("mypassword")
        assert verify_password("mypassword", hashed) is True

    def test_wrong_password_fails(self):
        hashed = hash_password("mypassword")
        assert verify_password("wrongpassword", hashed) is False

    def test_empty_password(self):
        hashed = hash_password("")
        assert verify_password("", hashed) is True
        assert verify_password("notempty", hashed) is False

    def test_same_password_different_hashes(self):
        """bcrypt генерирует разные хэши для одного пароля (соль)."""
        h1 = hash_password("password")
        h2 = hash_password("password")
        assert h1 != h2


class TestJWT:

    def test_token_created(self):
        token = create_access_token(user_id=42)
        assert isinstance(token, str)
        assert len(token) > 0

    def test_token_decoded(self):
        token = create_access_token(user_id=42)
        user_id = decode_access_token(token)
        assert user_id == 42

    def test_invalid_token_returns_none(self):
        assert decode_access_token("invalid.token.here") is None

    def test_empty_token_returns_none(self):
        assert decode_access_token("") is None

    def test_different_users_different_tokens(self):
        t1 = create_access_token(1)
        t2 = create_access_token(2)
        assert t1 != t2
        assert decode_access_token(t1) == 1
        assert decode_access_token(t2) == 2
