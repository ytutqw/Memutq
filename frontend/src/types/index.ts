export interface User {
  id: number
  email: string
  username: string
  created_at: string
}

export interface Deck {
  id: number
  title: string
  description: string | null
  is_public: boolean
  share_token: string | null
  created_at: string
}

export interface Card {
  id: number
  deck_id: number
  front: string
  back: string
  created_at: string
}

export interface DeckWithCards extends Deck {
  cards: Card[]
}

export interface ReviewResponse {
  card_id: number
  next_review: string
  interval_days: number
  easiness_factor: number
}

export interface Stats {
  reviewed_today: number
  pending: number
  total: number
}
