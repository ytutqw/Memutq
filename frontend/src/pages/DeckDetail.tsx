import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import api from '../api/client'
import { DeckWithCards, Card } from '../types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ── Превью изображения ────────────────────────────────────────────────────────
function CardImage({ filename, alt }: { filename: string; alt: string }) {
  return (
    <img
      src={`${API_URL}/files/${filename}`}
      alt={alt}
      className="rounded-lg mt-2 max-h-40 object-contain"
      style={{ border: '1px solid #3a3a38' }}
    />
  )
}

// ── Превью локального файла (до загрузки на сервер) ──────────────────────────
function LocalPreview({ file }: { file: File }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    const u = URL.createObjectURL(file)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [file])
  if (!url) return null
  return (
    <img src={url} alt="превью"
      className="rounded-lg mt-2 max-h-32 object-contain"
      style={{ border: '1px solid #3a3a38', opacity: 0.7 }} />
  )
}

// ── Зона вставки/загрузки для формы создания карточки ────────────────────────
function PasteZone({
  label,
  file,
  onChange,
}: {
  label: string
  file: File | null
  onChange: (f: File | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handlePaste = (e: React.ClipboardEvent) => {
    const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'))
    if (item) onChange(item.getAsFile())
  }

  return (
    <div
      onPaste={handlePaste}
      onClick={() => inputRef.current?.click()}
      className="w-full rounded-lg text-xs cursor-pointer flex items-center justify-between px-3 py-2 transition-colors"
      style={{ background: '#1f1f1e', border: '1px dashed #3a3a38', color: '#6b6860' }}
    >
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={e => onChange(e.target.files?.[0] ?? null)} />
      <span>{file ? `📎 ${file.name}` : `🖼 ${label} — вставьте Ctrl+V или нажмите`}</span>
      {file && (
        <button onClick={e => { e.stopPropagation(); onChange(null) }}
          className="ml-2 text-xs" style={{ color: '#e05252' }}>✕</button>
      )}
    </div>
  )
}

// ── Кнопка загрузки/замены фото для существующей карточки ────────────────────
function ImageUploadButton({
  cardId, side, hasImage, onDone,
}: {
  cardId: number
  side: 'front' | 'back'
  hasImage: boolean
  onDone: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const zoneRef = useRef<HTMLDivElement>(null)
  const [uploading, setUploading] = useState(false)

  const uploadFile = async (file: File) => {
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      await api.post(`/cards/${cardId}/upload-image?side=${side}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      onDone()
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'))
    if (item) { const f = item.getAsFile(); if (f) uploadFile(f) }
  }

  const handleDelete = async () => {
    if (!confirm('Удалить изображение?')) return
    await api.delete(`/cards/${cardId}/image?side=${side}`)
    onDone()
  }

  return (
    <div className="flex items-center gap-1 mt-1" onPaste={handlePaste}>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="text-xs px-2 py-0.5 rounded transition-colors disabled:opacity-50"
        style={{ background: '#333330', color: '#9e9b94' }}
        title="Нажмите или вставьте Ctrl+V"
      >
        {uploading ? '...' : hasImage ? '🖼 заменить' : '🖼 фото'}
      </button>
      {hasImage && (
        <button onClick={handleDelete}
          className="text-xs px-2 py-0.5 rounded"
          style={{ background: '#3a1a1a', color: '#e05252' }}>✕</button>
      )}
      {!hasImage && (
        <span className="text-xs" style={{ color: '#4a4a46' }}>или Ctrl+V</span>
      )}
    </div>
  )
}

// ── Главный компонент ─────────────────────────────────────────────────────────
export default function DeckDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [deck, setDeck] = useState<DeckWithCards | null>(null)
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [frontFile, setFrontFile] = useState<File | null>(null)
  const [backFile, setBackFile] = useState<File | null>(null)
  const [adding, setAdding] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState('')

  useEffect(() => { fetchDeck() }, [id])

  const fetchDeck = async () => {
    const { data } = await api.get(`/decks/${id}`)
    setDeck(data)
    setTitleValue(data.title)
    if (data.share_token) setShareUrl(`${window.location.origin}/share/${data.share_token}`)
  }

  const uploadImage = async (cardId: number, side: 'front' | 'back', file: File) => {
    const form = new FormData()
    form.append('file', file)
    await api.post(`/cards/${cardId}/upload-image?side=${side}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  }

  const addCard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!front.trim() || !back.trim()) return
    setAdding(true)
    try {
      const { data: card } = await api.post(`/decks/${id}/cards`, {
        front: front.trim(), back: back.trim(),
      })
      // Загружаем картинки если выбраны
      if (frontFile) await uploadImage(card.id, 'front', frontFile)
      if (backFile)  await uploadImage(card.id, 'back',  backFile)
      setFront('')
      setBack('')
      setFrontFile(null)
      setBackFile(null)
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
    if (!titleValue.trim() || titleValue === deck?.title) { setEditingTitle(false); return }
    await api.put(`/decks/${id}`, { title: titleValue.trim() })
    setEditingTitle(false)
    fetchDeck()
  }

  if (!deck) return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: '#1f1f1e', color: '#6b6860' }}>Загрузка...</div>
  )

  return (
    <div className="min-h-screen" style={{ background: '#1f1f1e', color: '#e8e6e1' }}>
      {/* Header */}
      <header style={{ background: '#2a2a28', borderBottom: '1px solid #3a3a38' }}
        className="px-4 sm:px-6 py-4 flex items-center gap-2 sm:gap-4 sticky top-0 z-10 flex-wrap">
        <Link to="/" className="text-sm flex-shrink-0" style={{ color: '#f5a623' }}>← Назад</Link>

        {editingTitle ? (
          <input autoFocus value={titleValue}
            onChange={e => setTitleValue(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(false) }}
            className="flex-1 text-base sm:text-lg font-bold outline-none bg-transparent min-w-0"
            style={{ color: '#e8e6e1', borderBottom: '2px solid #f5a623' }}
          />
        ) : (
          <h1 onClick={() => setEditingTitle(true)}
            className="text-base sm:text-lg font-bold flex-1 cursor-pointer truncate min-w-0"
            style={{ color: '#e8e6e1' }} title="Нажмите чтобы переименовать">
            {deck.title} ✎
          </h1>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <Link to={`/study/${id}`} className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium"
            style={{ background: '#f5a623', color: '#1f1f1e' }}>Повторять →</Link>
          <Link to={`/study/${id}?force=true`} className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium"
            style={{ background: '#333330', color: '#9e9b94' }}>Все</Link>
          <button onClick={shareDeck} className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium"
            style={{ background: '#333330', color: '#9e9b94' }}>Поделиться</button>
          <button onClick={deleteDeck} className="text-xs sm:text-sm"
            style={{ color: '#8a4040' }}>Удалить</button>
        </div>
      </header>

      {/* Ссылка шаринга */}
      {shareUrl && (
        <div className="px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-2"
          style={{ background: '#2a2218', borderBottom: '1px solid #5a4010' }}>
          <span className="text-sm font-medium flex-shrink-0" style={{ color: '#f5a623' }}>Ссылка:</span>
          <input readOnly value={shareUrl}
            onClick={e => (e.target as HTMLInputElement).select()}
            className="flex-1 text-xs px-3 py-1.5 rounded-lg cursor-pointer font-mono w-full"
            style={{ background: '#1f1f1e', border: '1px solid #5a4010', color: '#c98b1a' }} />
        </div>
      )}

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Форма добавления */}
        <form onSubmit={addCard} className="rounded-xl p-4 mb-6"
          style={{ background: '#2a2a28', border: '1px solid #3a3a38' }}>
          <p className="text-sm font-medium mb-3" style={{ color: '#9e9b94' }}>Добавить карточку</p>
          <div className="space-y-2">
            <input value={front} onChange={e => setFront(e.target.value)}
              placeholder="Лицевая сторона (вопрос)"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{ background: '#1f1f1e', border: '1px solid #3a3a38', color: '#e8e6e1' }} />
            <PasteZone label="Фото к вопросу" file={frontFile} onChange={setFrontFile} />
            {frontFile && <LocalPreview file={frontFile} />}

            <input value={back} onChange={e => setBack(e.target.value)}
              placeholder="Обратная сторона (ответ)"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{ background: '#1f1f1e', border: '1px solid #3a3a38', color: '#e8e6e1' }} />
            <PasteZone label="Фото к ответу" file={backFile} onChange={setBackFile} />
            {backFile && <LocalPreview file={backFile} />}
          </div>
          <button type="submit" disabled={adding}
            className="mt-3 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
            style={{ background: '#f5a623', color: '#1f1f1e' }}>
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
            {deck.cards.map((card: Card) => (
              <div key={card.id} className="rounded-xl p-4"
                style={{ background: '#2a2a28', border: '1px solid #3a3a38' }}>
                <div className="flex gap-4 items-start">
                  <div className="flex-1 min-w-0">
                    <div className="mb-3">
                      <p className="text-xs uppercase tracking-wide mb-1" style={{ color: '#6b6860' }}>Вопрос</p>
                      <p className="text-sm font-medium" style={{ color: '#e8e6e1' }}>{card.front}</p>
                      {card.front_image && <CardImage filename={card.front_image} alt="вопрос" />}
                      <ImageUploadButton cardId={card.id} side="front"
                        hasImage={!!card.front_image} onDone={fetchDeck} />
                    </div>
                    <div style={{ borderTop: '1px solid #3a3a38', paddingTop: '10px' }}>
                      <p className="text-xs uppercase tracking-wide mb-1" style={{ color: '#6b6860' }}>Ответ</p>
                      <p className="text-sm" style={{ color: '#9e9b94' }}>{card.back}</p>
                      {card.back_image && <CardImage filename={card.back_image} alt="ответ" />}
                      <ImageUploadButton cardId={card.id} side="back"
                        hasImage={!!card.back_image} onDone={fetchDeck} />
                    </div>
                  </div>
                  <button onClick={() => deleteCard(card.id)}
                    className="text-xs flex-shrink-0 transition-colors"
                    style={{ color: '#4a4a46' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#e05252')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#4a4a46')}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
