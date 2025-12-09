import { useState, useMemo, useEffect } from 'react'
import { CardStack, Bucket, Card } from '../types'
import { createCardStacks, filterCardStacks } from '../utils/cardUtils'
import { FilterButtons } from './FilterButtons'
import { printBucket, downloadPDF } from '../utils/api'

interface DeckEditorProps {
  cards: Card[]
  deckName: string
}

export function DeckEditor({ cards, deckName }: DeckEditorProps) {
  const [filters, setFilters] = useState<{ [key: string]: boolean }>({})
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null)
  const [renamingBucketId, setRenamingBucketId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null)

  // Create initial card stacks
  const allStacks = useMemo(() => createCardStacks(cards), [cards])

  // Create default buckets or load from localStorage
  const [buckets, setBuckets] = useState<Bucket[]>(() => {
    // Try to load from localStorage first
    const savedBuckets = localStorage.getItem(`buckets_${deckName}`)
    if (savedBuckets) {
      try {
        return JSON.parse(savedBuckets)
      } catch (e) {
        console.error('Failed to load saved buckets:', e)
      }
    }

    // If no saved state, create default buckets
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

  // Save buckets to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(`buckets_${deckName}`, JSON.stringify(buckets))
  }, [buckets, deckName])

  // Get all cards from all buckets
  const allBucketCards = useMemo(() => buckets.flatMap((b) => b.cards), [buckets])

  // Filter cards based on active filters
  const filteredCardIds = useMemo(() => {
    const filtered = filterCardStacks(allBucketCards, filters)
    return new Set(filtered.map((c) => c.id))
  }, [allBucketCards, filters])

  const handleFilterChange = (filterKey: string) => {
    setFilters((prev) => ({
      ...prev,
      [filterKey]: !prev[filterKey],
    }))
  }

  const handleBulkSelect = () => {
    const filtered = filterCardStacks(allBucketCards, filters)
    const filteredIds = new Set(filtered.map((c) => c.id))
    
    // Toggle: if all filtered are selected, deselect; otherwise select all
    const allSelected = filtered.every((c) => selectedIds.has(c.id))
    if (allSelected) {
      const newSelected = new Set(selectedIds)
      filtered.forEach((c) => newSelected.delete(c.id))
      setSelectedIds(newSelected)
    } else {
      const newSelected = new Set(selectedIds)
      filtered.forEach((c) => newSelected.add(c.id))
      setSelectedIds(newSelected)
    }
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
    // If the dragged card is not selected, select only it
    if (!selectedIds.has(cardId)) {
      setSelectedIds(new Set([cardId]))
    }
    
    // Store all selected card IDs to move together
    const cardsToMove = selectedIds.has(cardId) ? Array.from(selectedIds) : [cardId]
    setDraggedCardId(cardId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', JSON.stringify(cardsToMove))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDropToBucket = (e: React.DragEvent, bucketId: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Parse the card IDs from dataTransfer (could be array or single card)
    let cardIds: string[] = []
    try {
      const data = e.dataTransfer.getData('text/plain')
      cardIds = JSON.parse(data)
    } catch {
      // Fallback to draggedCardId if parsing fails
      if (draggedCardId) {
        cardIds = [draggedCardId]
      } else {
        console.error('No card ID found in drop event')
        return
      }
    }

    if (cardIds.length === 0) {
      console.error('No cards to move')
      return
    }

    // Build a map of all cards across all buckets for quick lookup
    const cardMap = new Map<string, CardStack>()
    buckets.forEach((bucket) => {
      bucket.cards.forEach((card) => {
        cardMap.set(card.id, card)
      })
    })

    // Collect the cards to move
    const cardsToMove: CardStack[] = cardIds
      .map((id) => cardMap.get(id))
      .filter((card): card is CardStack => card !== undefined)

    if (cardsToMove.length === 0) {
      console.error('None of the selected cards were found')
      return
    }

    // Remove all cards from all buckets and add to target bucket
    setBuckets((prev) =>
      prev.map((bucket) => {
        // Remove cards from other buckets
        if (bucket.id !== bucketId) {
          return {
            ...bucket,
            cards: bucket.cards.filter((c) => !cardIds.includes(c.id)),
          }
        }
        // Add to target bucket if not already there
        if (bucket.id === bucketId) {
          const existingIds = new Set(bucket.cards.map((c) => c.id))
          const cardsToAdd = cardsToMove.filter((c) => !existingIds.has(c.id))
          return {
            ...bucket,
            cards: [...bucket.cards, ...cardsToAdd],
          }
        }
        return bucket
      })
    )

    setDraggedCardId(null)
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

  const handleDeleteBucket = (bucketId: string, bucketName: string) => {
    const bucket = buckets.find((b) => b.id === bucketId)
    if (!bucket) return

    // Confirm deletion
    const confirmed = window.confirm(
      `Delete "${bucketName}" bucket?\n\nThis will move all ${bucket.cards.length} cards back to their default Owned or Unowned buckets.`
    )
    if (!confirmed) return

    // Move cards back to default buckets (owned/unowned)
    const ownedBucket = buckets.find((b) => b.id === 'owned')
    const unownedBucket = buckets.find((b) => b.id === 'unowned')

    setBuckets((prev) => {
      const updated = prev.filter((b) => b.id !== bucketId)
      
      // Add cards back to their default buckets
      return updated.map((b) => {
        if (b.id === 'owned' && ownedBucket) {
          const cardsToAdd = bucket.cards.filter((c) => c.isOwned)
          return { ...b, cards: [...b.cards, ...cardsToAdd] }
        }
        if (b.id === 'unowned' && unownedBucket) {
          const cardsToAdd = bucket.cards.filter((c) => !c.isOwned)
          return { ...b, cards: [...b.cards, ...cardsToAdd] }
        }
        return b
      })
    })
  }

  const handlePrintBucket = async (bucketId: string, bucketName: string) => {
    const bucket = buckets.find((b) => b.id === bucketId)
    if (!bucket || bucket.cards.length === 0) return

    setGeneratingPdfId(bucketId)
    try {
      const cardsForPdf = bucket.cards.map((card) => ({
        name: card.name,
        quantity: card.owned + card.unowned,
      }))

      const blob = await printBucket(cardsForPdf, deckName)
      downloadPDF(blob, `${bucketName}_${deckName}.pdf`)
    } catch (error) {
      alert(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setGeneratingPdfId(null)
    }
  }

  const handleExportText = (bucketId: string, bucketName: string) => {
    const bucket = buckets.find((b) => b.id === bucketId)
    if (!bucket) return

    const text = bucket.cards
      .map((card) => `${card.name} x${card.owned + card.unowned}`)
      .join('\n')

    const blob = new Blob([text], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${bucketName}_${deckName}.txt`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  return (
    <div className="h-full w-full flex flex-col bg-gray-100">
      {/* Filters - sticky header */}
      <div className="flex-shrink-0 border-b bg-white p-4">
        <FilterButtons
          filters={filters}
          onFilterChange={handleFilterChange}
          onBulkSelect={handleBulkSelect}
        />
      </div>

      {/* Main content area - flex-1 with overflow */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Buckets Grid - Dynamic 2-column layout with add button on right */}
        <div className="flex flex-col gap-4 w-full">
          {/* Main buckets container - 2-column grid */}
          <div className="grid grid-cols-2 gap-4 auto-rows-max w-full">
            {buckets.map((bucket) => {
              const bucketCardCount = bucket.cards.reduce((sum, c) => sum + c.owned + c.unowned, 0)
              const visibleCards = bucket.cards.filter((c) => filteredCardIds.has(c.id))

              return (
                <div
                  key={bucket.id}
                  className="bg-white rounded-lg shadow-md flex flex-col overflow-hidden border-2 border-gray-200 h-[600px]"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropToBucket(e, bucket.id)}
                >
                  {/* Header */}
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4 space-y-2 flex-shrink-0">
                    {renamingBucketId === bucket.id ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          autoFocus
                          className="flex-1 px-2 py-1 border rounded text-gray-800"
                        />
                        <button
                          onClick={() => {
                            handleRenameBucket(bucket.id, renameValue)
                            setRenamingBucketId(null)
                          }}
                          className="px-2 py-1 bg-green-500 hover:bg-green-600 rounded font-semibold text-sm"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-between items-start gap-2">
                        <div
                          onClick={() => {
                            setRenamingBucketId(bucket.id)
                            setRenameValue(bucket.name)
                          }}
                          className="cursor-pointer hover:opacity-80 transition-opacity flex-1"
                        >
                          <h3 className="text-lg font-bold">{bucket.name}</h3>
                          <p className="text-xs opacity-90">
                            {bucketCardCount} cards ({visibleCards.length} visible)
                          </p>
                        </div>
                        {bucket.id !== 'owned' && bucket.id !== 'unowned' && (
                          <button
                            onClick={() => handleDeleteBucket(bucket.id, bucket.name)}
                            className="px-2 py-1 bg-red-500 hover:bg-red-600 rounded font-semibold text-xs flex-shrink-0"
                            title="Delete this bucket"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Cards Grid */}
                  <div className="flex-1 p-4 overflow-y-scroll bg-gray-50">
                    {visibleCards.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                        {filteredCardIds.size > 0 ? 'No matching cards' : 'Drop cards here'}
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {visibleCards.map((card) => (
                          <div
                            key={card.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, card.id)}
                            onClick={() => handleSelectCard(card.id)}
                            className={`relative group cursor-pointer rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all transform hover:scale-110 flex-shrink-0 ${
                              selectedIds.has(card.id) ? 'ring-4 ring-blue-400' : ''
                            }`}
                          >
                            {/* Card Image */}
                            <div className="relative w-full aspect-[63/88] bg-gray-300">
                              {card.image_url ? (
                                <img
                                  src={card.image_url}
                                  alt={card.name}
                                  className={`w-full h-full object-cover ${
                                    card.isOwned ? '' : 'opacity-60'
                                  }`}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs text-gray-600 font-semibold bg-gray-400">
                                  No Image
                                </div>
                                )}

                              {/* Quantity Badge */}
                              {(card.owned > 0 || card.unowned > 0) && (
                                <div className="absolute top-[5%] right-[5%] bg-black bg-opacity-75 text-white px-[4%] py-[2%] rounded font-bold z-10 whitespace-nowrap" style={{ fontSize: '0.6em' }}>
                                  {card.owned > 0 && card.unowned > 0
                                    ? `${card.owned}+${card.unowned}`
                                    : card.owned > 0
                                      ? card.owned
                                      : card.unowned}
                                </div>
                              )}

                              {/* Selection Checkbox */}
                              <input
                                type="checkbox"
                                checked={selectedIds.has(card.id)}
                                onChange={() => handleSelectCard(card.id)}
                                onClick={(e) => e.stopPropagation()}
                                className="absolute top-[10%] left-[5%] w-[15%] h-[15%] min-w-3 min-h-3 cursor-pointer accent-blue-500 z-20"
                              />

                              {/* Drag Hint - only show on hover */}
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all z-0" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer Actions */}
                  <div className="border-t p-3 flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handlePrintBucket(bucket.id, bucket.name)}
                      disabled={bucket.cards.length === 0 || generatingPdfId === bucket.id}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-2 py-1 rounded text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      {generatingPdfId === bucket.id ? (
                        <>
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Generating...
                        </>
                      ) : (
                        'PDF'
                      )}
                    </button>
                    <button
                      onClick={() => handleExportText(bucket.id, bucket.name)}
                      disabled={bucket.cards.length === 0}
                      className="flex-1 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 text-white px-2 py-1 rounded text-sm font-semibold transition-colors"
                    >
                      Text
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Add Bucket Button - at bottom */}
          <div className="flex justify-end w-full">
            <button
              onClick={handleAddBucket}
              className="w-20 h-20 bg-gray-100 hover:bg-gray-200 rounded-lg shadow-md border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-600 font-bold text-3xl transition-colors"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Add Bucket Button - show if no buckets */}
      {buckets.length === 0 && (
        <div className="flex gap-4 p-4">
          <div className="flex-1" />
          <button
            onClick={handleAddBucket}
            className="w-20 h-20 bg-gray-100 hover:bg-gray-200 rounded-lg shadow-md border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-600 font-bold text-3xl transition-colors"
          >
            +
          </button>
        </div>
      )}
    </div>
  )
}
