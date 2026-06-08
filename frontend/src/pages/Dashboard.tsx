import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/client'
import { useAuthStore } from '../store/authStore'
import { Deck, Stats } from '../types'

export default function Dashboard() {
  const [decks, setDecks] = useState<Deck[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const [titleError, setTitleError] = useState('')
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    fetchDecks()
    fetchStats()
  }, [])

  const fetchDecks = async () => {
    const { data } = await api.get('/decks')
    setDecks(data)
  }

  const fetchStats = async () => {
    const { data } = await api.get('/study/stats')
    setStats(data)
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
    } finally {
      setCreating(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <span className="text-xl font-bold text-slate-800">Memutq</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500">{user?.username}</span>
          <button onClick={handleLogout} className="text-sm text-slate-500 hover:text-slate-800">
            Выйти
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: 'Повторено сегодня', value: stats.reviewed_today },
              { label: 'Ожидает повторения', value: stats.pending },
              { label: 'Всего карточек', value: stats.total },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{s.value}</div>
                <div className="text-xs text-slate-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={createDeck} className="flex flex-col gap-1 mb-6">
          <div className="flex gap-2">
            <input
              value={newTitle}
              onChange={e => {
                setNewTitle(e.target.value)
                if (titleError) setTitleError('')
              }}
              placeholder="Название новой колоды..."
              className={`flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                titleError ? 'border-red-400' : 'border-slate-300'
              }`}
            />
            <button
              type="submit" disabled={creating}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              + Создать
            </button>
          </div>
          {titleError && (
            <p className="text-red-500 text-xs ml-1">{titleError}</p>
          )}
        </form>

        {decks.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-lg">Нет колод</p>
            <p className="text-sm mt-1">Создайте первую колоду выше</p>
          </div>
        ) : (
          <div className="space-y-3">
            {decks.map(deck => (
              <Link
                key={deck.id} to={`/decks/${deck.id}`}
                className="block bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="font-medium text-slate-800">{deck.title}</div>
                {deck.description && (
                  <div className="text-sm text-slate-500 mt-1">{deck.description}</div>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
