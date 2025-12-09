export interface Card {
  name: string
  required_quantity: number
  owned_quantity: number
  net_needed_quantity: number
  status: 'Complete' | 'Proxy_Needed' | 'Missing' | 'Error_NotFound'
  image_url?: string
  rarity?: 'Unique' | 'Elite' | 'Exceptional' | 'Ordinary'
  price_usd?: number
  mana_cost?: string
  slug?: string
}

export interface CardStack {
  id: string
  name: string
  owned: number
  unowned: number
  image_url?: string
  rarity?: string
  isOwned: boolean
}

export interface Bucket {
  id: string
  name: string
  cards: CardStack[]
}

export interface EnrichedDeckResponse {
  status: string
  message: string
  deck_name: string
  decklist: Card[]
}

export type FilterKey = 'Unique' | 'Elite' | 'Exceptional' | 'Ordinary' | 'Owned' | 'Unowned'

export interface FilterState {
  [key: string]: boolean
}
