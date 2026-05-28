from dataclasses import dataclass
from datetime import date, timedelta


@dataclass
class SM2Result:
    easiness_factor: float
    interval_days: int
    repetitions: int
    next_review: date


def calculate_next_review(
    easiness_factor: float,
    interval_days: int,
    repetitions: int,
    quality: int,
) -> SM2Result:
    """
    Алгоритм SM-2 (SuperMemo 2, Wozniak 1987).

    quality 0–2 — провал, сброс прогресса
    quality 3–5 — успех, интервал растёт
    """
    if not (0 <= quality <= 5):
        raise ValueError(f"quality must be 0–5, got {quality}")

    if quality < 3:
        new_repetitions = 0
        new_interval = 1
    else:
        if repetitions == 0:
            new_interval = 1
        elif repetitions == 1:
            new_interval = 6
        else:
            new_interval = round(interval_days * easiness_factor)
        new_repetitions = repetitions + 1

    # Обновление E-фактора, минимум 1.3
    new_ef = easiness_factor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
    new_ef = max(1.3, round(new_ef, 4))

    return SM2Result(
        easiness_factor=new_ef,
        interval_days=new_interval,
        repetitions=new_repetitions,
        next_review=date.today() + timedelta(days=new_interval),
    )
