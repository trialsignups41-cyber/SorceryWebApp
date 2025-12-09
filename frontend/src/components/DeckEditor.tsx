import { useState, useMemo } from 'react'
import { CardStack, Bucket, Card } from '../types'
import { createCardStacks, filterCardStacks, bulkSelectByFilters } from '../utils/cardUtils'
import { FilterButtons } from './FilterButtons'
import { CardGrid } from './CardGrid'
import { BucketPane } from './BucketPane'

interface DeckEditorProps {
  cards: Card[]
  deckName: string
}

export function DeckEditor({ cards, deckName }: DeckEditorProps) {
  const [filters, setFilters] = useState<{ [key: string]: boolean }>({})
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null)

  // Create initial card stacks
  const allStacks = useMemo(() => createCardStacks(cards), [cards])

  // Create default buckets
  const [buckets, setBuckets] = useState<Bucket[]>(() => {
    const owned = allStacks.filter((s) => s.isOwned)
    const unowned = allStacks.filter((s) => !s.isOwned)

    return [
      {
        id: 'owned',
        name: 'Owned',
        cards: owned,
      },
      {
        id: 'unowned',
        name: 'Unowned',
        cards: unowned,
      },
    ]
  })

  // Filter displayed cards
  const filteredStacks = useMemo(
    () => filterCardStacks(allStacks, filters),
    [allStacks, filters]
  )

  const handleFilterChange = (filterKey: string) => {
    setFilters((prev) => ({
      ...prev,
      [filterKey]: !prev[filterKey],
    }))
  }

  const handleBulkSelect = () => {
    const newSelected = bulkSelectByFilters(allStacks, filters, selectedIds)
    setSelectedIds(newSelected)
  }

  const handleSelectCard = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    setDraggedCardId(cardId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDropToBucket = (e: React.DragEvent, bucketId: string) => {
    e.preventDefault()
    if (!draggedCardId) return

    // Get the card being dragged
    const draggedStack = allStacks.find((s) => s.id === draggedCardId)
    if (!draggedStack) return

    // Add to target bucket
    setBuckets((prev) =>
      prev.map((bucket) => {
        if (bucket.id === bucketId) {
          // Check if card already exists
          const existingIndex = bucket.cards.findIndex(
            (c) => c.id === draggedStack.id
          )
          if (existingIndex >= 0) {
            return bucket // Already in bucket
          }
          return {
            ...bucket,
            cards: [...bucket.cards, draggedStack],
          }
        }
        return bucket
      })
    )

    setDraggedCardId(null)
  }

  const handleRemoveCardFromBucket = (bucketId: string, cardId: string) => {
    setBuckets((prev) =>
      prev.map((bucket) => {
        if (bucket.id === bucketId) {
          return {
            ...bucket,
            cards: bucket.cards.filter((c) => c.id !== cardId),
          }
        }
        return bucket
      })
    )
  }

  const handleRenameBucket = (bucketId: string, newName: string) => {
    setBuckets((prev) =>
      prev.map((bucket) => {
        if (bucket.id === bucketId) {
          return { ...bucket, name: newName }
        }
        return bucket
      })
    )
  }

  const handleAddBucket = () => {
    const newBucket: Bucket = {
      id: `bucket-${Date.now()}`,
      name: `New Bucket`,
      cards: [],
    }
    setBuckets((prev) => [...prev, newBucket])
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <FilterButtons
        filters={filters}
        onFilterChange={handleFilterChange}
        onBulkSelect={handleBulkSelect}
      />

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Card Grid */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-bold mb-4">Available Cards ({filteredStacks.length})</h2>
            <div className="max-h-96 overflow-y-auto">
              <CardGrid
                cards={filteredStacks}
                selectedIds={selectedIds}
                onSelectCard={handleSelectCard}
                onDragStart={handleDragStart}
              />
            </div>
          </div>
        </div>

        {/* Buckets */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
          {buckets.map((bucket) => (
            <BucketPane
              key={bucket.id}
              bucket={bucket}
              cards={bucket.cards}
              deckName={deckName}
              onNameChange={handleRenameBucket}
              onDragOver={handleDragOver}
              onDrop={handleDropToBucket}
              onRemoveCard={handleRemoveCardFromBucket}
            />
          ))}

          {/* Add Bucket Button */}
          <button
            onClick={handleAddBucket}
            className="bucket-pane flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-2xl transition-colors"
          >
            +
          </button>
        </div>
      </div>
    </div>
  )
}
