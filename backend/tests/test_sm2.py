"""
Unit-тесты алгоритма SM-2.
Тестируем чистую функцию — база данных не нужна.
"""
from datetime import date, timedelta
import pytest

from app.services.sm2_service import calculate_next_review, SM2Result


# ── Базовые случаи ────────────────────────────────────────────────────────────

class TestSM2FirstRepetition:
    """Первое повторение (repetitions=0)."""

    def test_quality_5_first_rep(self):
        result = calculate_next_review(2.5, 1, 0, quality=5)
        assert result.repetitions == 1
        assert result.interval_days == 1
        assert result.next_review == date.today() + timedelta(days=1)

    def test_quality_3_first_rep(self):
        result = calculate_next_review(2.5, 1, 0, quality=3)
        assert result.repetitions == 1
        assert result.interval_days == 1

    def test_quality_2_first_rep_resets(self):
        """Оценка < 3 — сброс прогресса."""
        result = calculate_next_review(2.5, 1, 0, quality=2)
        assert result.repetitions == 0
        assert result.interval_days == 1

    def test_quality_0_resets(self):
        result = calculate_next_review(2.5, 10, 5, quality=0)
        assert result.repetitions == 0
        assert result.interval_days == 1


class TestSM2SecondRepetition:
    """Второе повторение (repetitions=1)."""

    def test_quality_4_second_rep(self):
        result = calculate_next_review(2.5, 1, 1, quality=4)
        assert result.repetitions == 2
        assert result.interval_days == 6
        assert result.next_review == date.today() + timedelta(days=6)

    def test_quality_1_second_rep_resets(self):
        result = calculate_next_review(2.5, 1, 1, quality=1)
        assert result.repetitions == 0
        assert result.interval_days == 1


class TestSM2NthRepetition:
    """N-е повторение (repetitions > 1) — интервал по формуле."""

    def test_interval_grows_with_ef(self):
        """Интервал = предыдущий * EF (округлённо)."""
        result = calculate_next_review(2.5, 6, 2, quality=4)
        assert result.interval_days == round(6 * 2.5)
        assert result.repetitions == 3

    def test_interval_after_multiple_reps(self):
        result = calculate_next_review(2.5, 15, 3, quality=5)
        assert result.interval_days == round(15 * 2.5)


# ── E-фактор ──────────────────────────────────────────────────────────────────

class TestEasinessFactor:

    def test_ef_increases_on_quality_5(self):
        result = calculate_next_review(2.5, 1, 1, quality=5)
        assert result.easiness_factor > 2.5

    def test_ef_decreases_on_quality_3(self):
        result = calculate_next_review(2.5, 1, 1, quality=3)
        assert result.easiness_factor < 2.5

    def test_ef_minimum_is_1_3(self):
        """E-фактор никогда не опускается ниже 1.3."""
        result = calculate_next_review(1.3, 1, 1, quality=0)
        assert result.easiness_factor >= 1.3

    def test_ef_minimum_enforced_after_bad_streak(self):
        ef = 2.5
        for _ in range(20):
            r = calculate_next_review(ef, 1, 1, quality=0)
            ef = r.easiness_factor
        assert ef >= 1.3

    def test_ef_quality_4_unchanged(self):
        """При quality=4 E-фактор не должен изменяться (по формуле SM-2)."""
        result = calculate_next_review(2.5, 1, 1, quality=4)
        assert abs(result.easiness_factor - 2.5) < 0.01


# ── Граничные значения ────────────────────────────────────────────────────────

class TestEdgeCases:

    def test_invalid_quality_raises(self):
        with pytest.raises(ValueError):
            calculate_next_review(2.5, 1, 0, quality=6)

    def test_invalid_quality_negative_raises(self):
        with pytest.raises(ValueError):
            calculate_next_review(2.5, 1, 0, quality=-1)

    def test_returns_sm2result(self):
        result = calculate_next_review(2.5, 1, 0, quality=4)
        assert isinstance(result, SM2Result)

    def test_next_review_is_future_on_success(self):
        result = calculate_next_review(2.5, 6, 2, quality=4)
        assert result.next_review > date.today()

    def test_next_review_is_tomorrow_on_fail(self):
        result = calculate_next_review(2.5, 10, 5, quality=0)
        assert result.next_review == date.today() + timedelta(days=1)

    def test_all_quality_values_work(self):
        """Все допустимые оценки 0–5 должны отработать без ошибок."""
        for q in range(6):
            result = calculate_next_review(2.5, 1, 0, quality=q)
            assert result is not None
