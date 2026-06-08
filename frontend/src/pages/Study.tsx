import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../api/client'
import { Card } from '../types'

const QUALITY_LABELS: Record<number, { label: string; bg: string; color: string }> = {
  0: { label: 'Не знаю',  bg: '#3a1a1a', color: '#e05252' },
  1: { label: 'Почти',    bg: '#3a2a1a', color: '#e08a52' },
  2: { label: 'Трудно',   bg: '#3a331a', color: '#c9a81a' },
  3: { label: 'С трудом', bg: '#2a331a', color: '#8ab81a' },
  4: { label: 'Хорошо',   bg: '#1a3320', color: '#52c97a' },
  5: { label: 'Отлично',  bg: '#1a3328', color: '#52c9a8' },
}

export default function Study() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const force = searchParams.get('force') === 'true'

  const [cards, setCards] = useState<Card[]>([])
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api.get(`/study/${id}/session`, { params: { force } }).then(({ data }) => {
      setCards(data)
      setLoading(false)
      if (data.length === 0) setDone(true)
    })
  }, [id])

  const currentCard = cards[index]

  const submitReview = async (quality: number) => {
    if (!currentCard || submitting) return
    setSubmitting(true)
    try {
      await api.post('/study/review', { card_id: currentCard.id, quality })
      const nextIndex = index + 1
      if (nextIndex >= cards.length) {
        setDone(true)
      } else {
        setIndex(nextIndex)
        setFlipped(false)
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: '#1f1f1e', color: '#6b6860' }}>
      Загрузка...
    </div>
  )

  if (done) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4"
      style={{ background: '#1f1f1e' }}>
      <div className="text-5xl">🎉</div>
      <h2 className="text-2xl font-bold" style={{ color: '#e8e6e1' }}>Готово!</h2>
      <p style={{ color: '#9e9b94' }}>Все карточки повторены</p>
      <Link to={`/decks/${id}`}
        className="mt-4 px-6 py-2 rounded-lg text-sm font-medium"
        style={{ background: '#f5a623', color: '#1f1f1e' }}>
        Назад к колоде
      </Link>
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#1f1f1e' }}>
      {/* Header */}
      <header style={{ background: '#2a2a28', borderBottom: '1px solid #3a3a38' }}
        className="px-4 sm:px-6 py-4 flex items-center gap-4">
        <Link to={`/decks/${id}`} className="text-sm" style={{ color: '#f5a623' }}>← Назад</Link>
        <span className="text-sm ml-auto" style={{ color: '#6b6860' }}>
          {index + 1} / {cards.length}
        </span>
      </header>

      {/* Прогресс-бар */}
      <div className="h-1" style={{ background: '#2a2a28' }}>
        <div
          className="h-1 transition-all"
          style={{ width: `${(index / cards.length) * 100}%`, background: '#f5a623' }}
        />
      </div>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-6 sm:py-8 gap-6">
        {/* Карточка */}
        <div
          onClick={() => setFlipped(f => !f)}
          className="w-full max-w-lg rounded-2xl p-6 sm:p-10 flex items-center justify-center cursor-pointer select-none transition-all"
          style={{
            background: '#2a2a28',
            border: '1px solid #3a3a38',
            minHeight: '200px',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = '#f5a623')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = '#3a3a38')}
        >
          <div className="text-center">
            <p className="text-xs uppercase tracking-widest mb-4" style={{ color: '#6b6860' }}>
              {flipped ? 'Ответ' : 'Вопрос'}
            </p>
            <p className="text-lg sm:text-xl leading-relaxed" style={{ color: '#e8e6e1' }}>
              {flipped ? currentCard.back : currentCard.front}
            </p>
            {!flipped && (
              <p className="text-xs mt-6" style={{ color: '#4a4a46' }}>нажмите чтобы открыть</p>
            )}
          </div>
        </div>

        {/* Кнопки оценки */}
        {flipped ? (
          <div className="w-full max-w-lg">
            <p className="text-xs text-center mb-3" style={{ color: '#6b6860' }}>Как хорошо вы знали ответ?</p>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(QUALITY_LABELS).map(([q, { label, bg, color }]) => (
                <button
                  key={q}
                  onClick={() => submitReview(Number(q))}
                  disabled={submitting}
                  className="py-2.5 px-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  style={{ background: bg, color }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <button
            onClick={() => setFlipped(true)}
            className="px-8 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={{ background: '#f5a623', color: '#1f1f1e' }}
          >
            Показать ответ
          </button>
        )}
      </main>
    </div>
  )
}