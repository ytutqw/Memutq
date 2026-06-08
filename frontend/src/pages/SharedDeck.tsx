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
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: '#1f1f1e', color: '#6b6860' }}>
      Загрузка...
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: '#1f1f1e', color: '#e8e6e1' }}>
      <header style={{ background: '#2a2a28', borderBottom: '1px solid #3a3a38' }}
        className="px-4 sm:px-6 py-4 flex items-center gap-4">
        <Link to="/" className="text-sm" style={{ color: '#f5a623' }}>← На главную</Link>
        <h1 className="text-base sm:text-lg font-bold flex-1 truncate" style={{ color: '#e8e6e1' }}>
          {deck.title}
        </h1>
        <button
          onClick={copyDeck}
          disabled={copying || copied}
          className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors flex-shrink-0"
          style={{ background: '#f5a623', color: '#1f1f1e' }}
        >
          {copied ? '✓ Скопировано!' : copying ? 'Копируем...' : 'Скопировать себе'}
        </button>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {deck.description && (
          <p className="text-sm mb-6" style={{ color: '#9e9b94' }}>{deck.description}</p>
        )}
        <p className="text-sm mb-3" style={{ color: '#6b6860' }}>{deck.cards.length} карточек</p>
        <div className="space-y-2">
          {deck.cards.map(card => (
            <div key={card.id}
              className="rounded-xl p-4"
              style={{ background: '#2a2a28', border: '1px solid #3a3a38' }}>
              <p className="text-sm font-medium" style={{ color: '#e8e6e1' }}>{card.front}</p>
              <p className="text-sm mt-1" style={{ color: '#9e9b94' }}>{card.back}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}