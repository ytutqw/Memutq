import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../api/client'
import { Card } from '../types'

const QUALITY_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: 'Не знаю',  color: 'bg-red-100 text-red-700 hover:bg-red-200' },
  1: { label: 'Почти',    color: 'bg-orange-100 text-orange-700 hover:bg-orange-200' },
  2: { label: 'Трудно',   color: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' },
  3: { label: 'С трудом', color: 'bg-lime-100 text-lime-700 hover:bg-lime-200' },
  4: { label: 'Хорошо',   color: 'bg-green-100 text-green-700 hover:bg-green-200' },
  5: { label: 'Отлично',  color: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' },
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">
      Загрузка...
    </div>
  )

  if (done) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
      <div className="text-5xl">🎉</div>
      <h2 className="text-2xl font-bold text-slate-800">Готово!</h2>
      <p className="text-slate-500">Все карточки на сегодня повторены</p>
      <Link to={`/decks/${id}`} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
        Назад к колоде
      </Link>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4">
        <Link to={`/decks/${id}`} className="text-blue-600 text-sm hover:underline">← Назад</Link>
        <span className="text-sm text-slate-500 ml-auto">{index + 1} / {cards.length}</span>
      </header>

      <div className="h-1 bg-slate-200">
        <div
          className="h-1 bg-blue-500 transition-all"
          style={{ width: `${(index / cards.length) * 100}%` }}
        />
      </div>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 gap-6">
        <div
          onClick={() => setFlipped(f => !f)}
          className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-sm p-8 min-h-48 flex items-center justify-center cursor-pointer hover:shadow-md transition-shadow select-none"
        >
          <div className="text-center">
            <p className="text-xs text-slate-400 mb-3 uppercase tracking-wide">
              {flipped ? 'Ответ' : 'Вопрос'}
            </p>
            <p className="text-xl text-slate-800 leading-relaxed">
              {flipped ? currentCard.back : currentCard.front}
            </p>
            {!flipped && (
              <p className="text-xs text-slate-400 mt-4">нажмите чтобы открыть</p>
            )}
          </div>
        </div>

        {flipped ? (
          <div className="w-full max-w-lg">
            <p className="text-xs text-slate-500 text-center mb-3">Как хорошо вы знали ответ?</p>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(QUALITY_LABELS).map(([q, { label, color }]) => (
                <button
                  key={q}
                  onClick={() => submitReview(Number(q))}
                  disabled={submitting}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${color}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <button
            onClick={() => setFlipped(true)}
            className="bg-blue-600 text-white px-8 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Показать ответ
          </button>
        )}
      </main>
    </div>
  )
}