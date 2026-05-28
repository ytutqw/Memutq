import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../api/client'
import { DeckWithCards } from '../types'

export default function DeckDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [deck, setDeck] = useState<DeckWithCards | null>(null)
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [adding, setAdding] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState('')

  useEffect(() => { fetchDeck() }, [id])

  const fetchDeck = async () => {
    const { data } = await api.get(`/decks/${id}`)
    setDeck(data)
    setTitleValue(data.title)
    if (data.share_token) {
      setShareUrl(`${window.location.origin}/share/${data.share_token}`)
    }
  }

  const addCard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!front.trim() || !back.trim()) return
    setAdding(true)
    try {
      await api.post(`/decks/${id}/cards`, { front: front.trim(), back: back.trim() })
      setFront('')
      setBack('')
      fetchDeck()
    } finally {
      setAdding(false)
    }
  }

  const deleteCard = async (cardId: number) => {
    if (!confirm('Удалить карточку?')) return
    await api.delete(`/cards/${cardId}`)
    fetchDeck()
  }

  const deleteDeck = async () => {
    if (!confirm('Удалить колоду и все карточки?')) return
    await api.delete(`/decks/${id}`)
    navigate('/')
  }

  const shareDeck = async () => {
    const { data } = await api.post(`/decks/${id}/share`)
    setShareUrl(`${window.location.origin}/share/${data.share_token}`)
  }

  const saveTitle = async () => {
    if (!titleValue.trim() || titleValue === deck?.title) {
      setEditingTitle(false)
      return
    }
    await api.put(`/decks/${id}`, { title: titleValue.trim() })
    setEditingTitle(false)
    fetchDeck()
  }

  if (!deck) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">Загрузка...</div>

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4">
        <Link to="/" className="text-blue-600 text-sm hover:underline">← Назад</Link>

        {editingTitle ? (
          <input
            autoFocus
            value={titleValue}
            onChange={e => setTitleValue(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(false) }}
            className="flex-1 text-lg font-bold text-slate-800 border-b-2 border-blue-500 outline-none bg-transparent"
          />
        ) : (
          <h1
            onClick={() => setEditingTitle(true)}
            className="text-lg font-bold text-slate-800 flex-1 cursor-pointer hover:text-blue-600 transition-colors"
            title="Нажмите чтобы переименовать"
          >
            {deck.title} ✎
          </h1>
        )}

        <Link
          to={`/study/${id}`}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Повторять →
        </Link>
        <Link
          to={`/study/${id}?force=true`}
          className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
        >
          Повторить всё
        </Link>
        <button
          onClick={shareDeck}
          className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
        >
          Поделиться
        </button>
        <button onClick={deleteDeck} className="text-sm text-red-400 hover:text-red-600">
          Удалить колоду
        </button>
      </header>

      {shareUrl && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-3 flex items-center gap-3">
          <span className="text-sm text-blue-700 font-medium">Ссылка для шаринга:</span>
          <input
            readOnly
            value={shareUrl}
            onClick={e => (e.target as HTMLInputElement).select()}
            className="flex-1 text-sm px-3 py-1.5 border border-blue-300 rounded-lg text-blue-800 bg-white cursor-pointer font-mono"
          />
          <span className="text-xs text-blue-500">нажми на поле чтобы выделить</span>
        </div>
      )}

      <main className="max-w-2xl mx-auto px-4 py-8">
        <form onSubmit={addCard} className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <p className="text-sm font-medium text-slate-700 mb-3">Добавить карточку</p>
          <div className="space-y-2">
            <input
              value={front} onChange={e => setFront(e.target.value)}
              placeholder="Лицевая сторона (вопрос)"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              value={back} onChange={e => setBack(e.target.value)}
              placeholder="Обратная сторона (ответ)"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit" disabled={adding}
            className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {adding ? 'Добавляем...' : '+ Добавить'}
          </button>
        </form>

        <p className="text-sm text-slate-500 mb-3">{deck.cards.length} карточек</p>
        {deck.cards.length === 0 ? (
          <div className="text-center py-12 text-slate-400">Нет карточек — добавьте первую выше</div>
        ) : (
          <div className="space-y-2">
            {deck.cards.map(card => (
              <div key={card.id} className="bg-white rounded-xl border border-slate-200 p-4 flex gap-4 items-start">
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">{card.front}</p>
                  <p className="text-sm text-slate-500 mt-1">{card.back}</p>
                </div>
                <button onClick={() => deleteCard(card.id)} className="text-slate-300 hover:text-red-400 text-xs">
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
