import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../api/client'
import { useAuthStore } from '../store/authStore'
import { DeckWithCards } from '../types'

export default function SharedDeck() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { token: authToken } = useAuthStore()
  const [deck, setDeck] = useState<DeckWithCards | null>(null)
  const [copying, setCopying] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    api.get(`/decks/shared/${token}`).then(({ data }) => setDeck(data))
  }, [token])

  const copyDeck = async () => {
    if (!authToken) { navigate('/login'); return }
    setCopying(true)
    try {
      await api.post(`/decks/shared/${token}/copy`)
      setCopied(true)
      setTimeout(() => navigate('/'), 1500)
    } finally {
      setCopying(false)
    }
  }

  if (!deck) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">
      Загрузка...
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4">
        <Link to="/" className="text-blue-600 text-sm hover:underline">← На главную</Link>
        <h1 className="text-lg font-bold text-slate-800 flex-1">{deck.title}</h1>
        <button
          onClick={copyDeck}
          disabled={copying || copied}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {copied ? '✓ Скопировано!' : copying ? 'Копируем...' : 'Скопировать себе'}
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {deck.description && (
          <p className="text-slate-500 text-sm mb-6">{deck.description}</p>
        )}
        <p className="text-sm text-slate-500 mb-3">{deck.cards.length} карточек</p>
        <div className="space-y-2">
          {deck.cards.map(card => (
            <div key={card.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-medium text-slate-800">{card.front}</p>
              <p className="text-sm text-slate-500 mt-1">{card.back}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}