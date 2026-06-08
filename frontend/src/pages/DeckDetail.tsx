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

  if (!deck) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#1f1f1e', color: '#6b6860' }}>
      Загрузка...
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: '#1f1f1e', color: '#e8e6e1' }}>
      {/* Header */}
      <header style={{ background: '#2a2a28', borderBottom: '1px solid #3a3a38' }}
        className="px-4 sm:px-6 py-4 flex items-center gap-2 sm:gap-4 sticky top-0 z-10 flex-wrap">
        <Link to="/" className="text-sm flex-shrink-0 transition-colors" style={{ color: '#f5a623' }}>← Назад</Link>

        {editingTitle ? (
          <input
            autoFocus
            value={titleValue}
            onChange={e => setTitleValue(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(false) }}
            className="flex-1 text-base sm:text-lg font-bold outline-none bg-transparent min-w-0"
            style={{ color: '#e8e6e1', borderBottom: '2px solid #f5a623' }}
          />
        ) : (
          <h1
            onClick={() => setEditingTitle(true)}
            className="text-base sm:text-lg font-bold flex-1 cursor-pointer transition-colors truncate min-w-0"
            style={{ color: '#e8e6e1' }}
            title="Нажмите чтобы переименовать"
          >
            {deck.title} ✎
          </h1>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to={`/study/${id}`}
            className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors"
            style={{ background: '#f5a623', color: '#1f1f1e' }}
          >
            Повторять →
          </Link>
          <Link
            to={`/study/${id}?force=true`}
            className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors"
            style={{ background: '#333330', color: '#9e9b94' }}
          >
            Все
          </Link>
          <button
            onClick={shareDeck}
            className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors"
            style={{ background: '#333330', color: '#9e9b94' }}
          >
            Поделиться
          </button>
          <button
            onClick={deleteDeck}
            className="text-xs sm:text-sm transition-colors"
            style={{ color: '#8a4040' }}
          >
            Удалить
          </button>
        </div>
      </header>

      {/* Ссылка шаринга */}
      {shareUrl && (
        <div className="px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-2"
          style={{ background: '#2a2218', borderBottom: '1px solid #5a4010' }}>
          <span className="text-sm font-medium flex-shrink-0" style={{ color: '#f5a623' }}>Ссылка:</span>
          <input
            readOnly
            value={shareUrl}
            onClick={e => (e.target as HTMLInputElement).select()}
            className="flex-1 text-xs px-3 py-1.5 rounded-lg cursor-pointer font-mono w-full"
            style={{ background: '#1f1f1e', border: '1px solid #5a4010', color: '#c98b1a' }}
          />
        </div>
      )}

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Форма добавления */}
        <form onSubmit={addCard}
          className="rounded-xl p-4 mb-6"
          style={{ background: '#2a2a28', border: '1px solid #3a3a38' }}>
          <p className="text-sm font-medium mb-3" style={{ color: '#9e9b94' }}>Добавить карточку</p>
          <div className="space-y-2">
            <input
              value={front} onChange={e => setFront(e.target.value)}
              placeholder="Лицевая сторона (вопрос)"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{ background: '#1f1f1e', border: '1px solid #3a3a38', color: '#e8e6e1' }}
            />
            <input
              value={back} onChange={e => setBack(e.target.value)}
              placeholder="Обратная сторона (ответ)"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{ background: '#1f1f1e', border: '1px solid #3a3a38', color: '#e8e6e1' }}
            />
          </div>
          <button
            type="submit" disabled={adding}
            className="mt-3 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
            style={{ background: '#f5a623', color: '#1f1f1e' }}
          >
            {adding ? 'Добавляем...' : '+ Добавить'}
          </button>
        </form>

        {/* Список карточек */}
        <p className="text-sm mb-3" style={{ color: '#6b6860' }}>{deck.cards.length} карточек</p>
        {deck.cards.length === 0 ? (
          <div className="text-center py-12" style={{ color: '#6b6860' }}>
            Нет карточек — добавьте первую выше
          </div>
        ) : (
          <div className="space-y-2">
            {deck.cards.map(card => (
              <div key={card.id}
                className="rounded-xl p-4 flex gap-4 items-start"
                style={{ background: '#2a2a28', border: '1px solid #3a3a38' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: '#e8e6e1' }}>{card.front}</p>
                  <p className="text-sm mt-1" style={{ color: '#9e9b94' }}>{card.back}</p>
                </div>
                <button
                  onClick={() => deleteCard(card.id)}
                  className="text-xs flex-shrink-0 transition-colors"
                  style={{ color: '#4a4a46' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#e05252')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#4a4a46')}
                >✕</button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}