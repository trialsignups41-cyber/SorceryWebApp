import { Card, CardStack } from '../types'

/**
 * Converts enriched deck cards into stacks, splitting owned/unowned when mixed
 */
export function createCardStacks(cards: Card[]): CardStack[] {
  const stacks: CardStack[] = []
  const seen = new Set<string>()

  for (const card of cards) {
    if (seen.has(card.name)) continue

    // Calculate owned and unowned quantities based on status
    let owned = 0
    let unowned = 0

    if (card.status === 'Complete') {
      // User owns all required copies
      owned = card.required_quantity
      unowned = 0
    } else if (card.status === 'Proxy_Needed') {
      // User owns some but not all - split into separate stacks
      owned = card.owned_quantity
      unowned = card.net_needed_quantity
    } else {
      // Missing - user owns none
      owned = 0
      unowned = card.required_quantity
    }

    // Add owned stack if exists
    if (owned > 0) {
      stacks.push({
        id: `${card.name}-owned`,
        name: card.name,
        owned,
        unowned: 0,
        image_url: card.image_url,
        rarity: card.rarity,
        isOwned: true,
      })
    }

    // Add unowned stack if exists
    if (unowned > 0) {
      stacks.push({
        id: `${card.name}-unowned`,
        name: card.name,
        owned: 0,
        unowned,
        image_url: card.image_url,
        rarity: card.rarity,
        isOwned: false,
      })
    }

    seen.add(card.name)
  }

  return stacks
}

/**
 * Filters card stacks based on active filters (AND logic)
 */
export function filterCardStacks(
  stacks: CardStack[],
  activeFilters: { [key: string]: boolean }
): CardStack[] {
  const rarityFilters = Object.entries(activeFilters)
    .filter(([k]) => ['Unique', 'Elite', 'Exceptional', 'Ordinary'].includes(k))
    .filter(([, v]) => v)
    .map(([k]) => k)

  const ownershipFilters = Object.entries(activeFilters)
    .filter(([k]) => ['Owned', 'Unowned'].includes(k))
    .filter(([, v]) => v)
    .map(([k]) => k)

  // If no filters active, return all
  if (rarityFilters.length === 0 && ownershipFilters.length === 0) {
    return stacks
  }

  return stacks.filter((stack) => {
    // Check rarity filter (OR logic within rarity)
    if (rarityFilters.length > 0) {
      if (!stack.rarity || !rarityFilters.includes(stack.rarity)) {
        return false
      }
    }

    // Check ownership filter (OR logic within ownership)
    if (ownershipFilters.length > 0) {
      const matchesOwnership =
        (ownershipFilters.includes('Owned') && stack.isOwned) ||
        (ownershipFilters.includes('Unowned') && !stack.isOwned)
      if (!matchesOwnership) {
        return false
      }
    }

    return true
  })
}

/**
 * Bulk selects card stacks based on active filters
 */
export function bulkSelectByFilters(
  stacks: CardStack[],
  activeFilters: { [key: string]: boolean },
  selectedIds: Set<string>
): Set<string> {
  const filtered = filterCardStacks(stacks, activeFilters)
  const newSelected = new Set(selectedIds)

  filtered.forEach((stack) => {
    newSelected.add(stack.id)
  })

  return newSelected
}
