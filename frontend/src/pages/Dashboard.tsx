import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/client'
import { useAuthStore } from '../store/authStore'
import { Deck, Stats } from '../types'

interface DeckStat {
  deck_id: number
  due: number
}

export default function Dashboard() {
  const [decks, setDecks] = useState<Deck[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [deckStats, setDeckStats] = useState<DeckStat[]>([])
  const [newTitle, setNewTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const [titleError, setTitleError] = useState('')
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    fetchDecks()
    fetchStats()
    fetchDeckStats()
  }, [])

  const fetchDecks = async () => {
    const { data } = await api.get('/decks')
    setDecks(data)
  }

  const fetchStats = async () => {
    const { data } = await api.get('/study/stats')
    setStats(data)
  }

  const fetchDeckStats = async () => {
    try {
      const { data } = await api.get('/study/decks-stats')
      setDeckStats(data)
    } catch {
      // тихо игнорируем если эндпоинт недоступен
    }
  }

  const getDue = (deckId: number) => {
    const s = deckStats.find(d => d.deck_id === deckId)
    return s ? s.due : 0
  }

  const createDeck = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) {
      setTitleError('Введите название колоды')
      return
    }
    setTitleError('')
    setCreating(true)
    try {
      await api.post('/decks', { title: newTitle.trim() })
      setNewTitle('')
      fetchDecks()
      fetchDeckStats()
    } finally {
      setCreating(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen" style={{ background: '#1f1f1e', color: '#e8e6e1' }}>
      {/* Header */}
      <header style={{ background: '#2a2a28', borderBottom: '1px solid #3a3a38' }}
        className="px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <span className="text-lg sm:text-xl font-bold" style={{ color: '#f5a623' }}>Memutq</span>
        <div className="flex items-center gap-3">
          <span className="text-sm hidden sm:block" style={{ color: '#9e9b94' }}>{user?.username}</span>
          <button
            onClick={handleLogout}
            className="text-sm px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: '#9e9b94', background: '#333330' }}
          >
            Выйти
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
        {/* Статистика */}
        {stats && (
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { label: 'Повторено', value: stats.reviewed_today },
              { label: 'Ожидает', value: stats.pending },
              { label: 'Карточек', value: stats.total },
            ].map(s => (
              <div key={s.label}
                className="rounded-xl p-4 text-center"
                style={{ background: '#2a2a28', border: '1px solid #3a3a38' }}>
                <div className="text-2xl sm:text-3xl font-bold" style={{ color: '#f5a623' }}>{s.value}</div>
                <div className="text-xs mt-1" style={{ color: '#9e9b94' }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Создать колоду */}
        <form onSubmit={createDeck} className="flex flex-col gap-1 mb-6">
          <div className="flex gap-2">
            <input
              value={newTitle}
              onChange={e => {
                setNewTitle(e.target.value)
                if (titleError) setTitleError('')
              }}
              placeholder="Название новой колоды..."
              className="flex-1 px-4 py-2.5 rounded-lg text-sm outline-none transition-all"
              style={{
                background: '#2a2a28',
                border: titleError ? '1px solid #e05252' : '1px solid #3a3a38',
                color: '#e8e6e1',
              }}
            />
            <button
              type="submit" disabled={creating}
              className="px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 whitespace-nowrap"
              style={{ background: '#f5a623', color: '#1f1f1e' }}
            >
              {creating ? '...' : '+ Создать'}
            </button>
          </div>
          {titleError && <p className="text-xs ml-1" style={{ color: '#e05252' }}>{titleError}</p>}
        </form>

        {/* Список колод */}
        {decks.length === 0 ? (
          <div className="text-center py-16" style={{ color: '#6b6860' }}>
            <p className="text-lg">Нет колод</p>
            <p className="text-sm mt-1">Создайте первую колоду выше</p>
          </div>
        ) : (
          <div className="space-y-2">
            {decks.map(deck => {
              const due = getDue(deck.id)
              return (
                <Link
                  key={deck.id} to={`/decks/${deck.id}`}
                  className="flex items-center justify-between rounded-xl p-4 transition-all"
                  style={{ background: '#2a2a28', border: '1px solid #3a3a38' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = '#f5a623')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = '#3a3a38')}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate" style={{ color: '#e8e6e1' }}>{deck.title}</div>
                    {deck.description && (
                      <div className="text-sm mt-0.5 truncate" style={{ color: '#9e9b94' }}>{deck.description}</div>
                    )}
                  </div>
                  {due > 0 && (
                    <div className="ml-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg flex-shrink-0"
                      style={{ background: '#3a2e1a', border: '1px solid #f5a623' }}>
                      <span className="text-sm font-bold" style={{ color: '#f5a623' }}>{due}</span>
                      <span className="text-xs" style={{ color: '#c98b1a' }}>повторить</span>
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}