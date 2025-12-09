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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    // Try to load from localStorage first
    const savedSelection = localStorage.getItem(`selectedIds_${deckName}`)
    if (savedSelection) {
      try {
        return new Set(JSON.parse(savedSelection))
      } catch (e) {
        console.error('Failed to load saved selection:', e)
      }
    }
    return new Set()
  })
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

  useEffect(() => {
    localStorage.setItem(`selectedIds_${deckName}`, JSON.stringify(Array.from(selectedIds)))
  }, [selectedIds, deckName])

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

  const handleDeselectAll = () => {
    setSelectedIds(new Set())
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

  const handleInstantiateCard = (bucketId: string, cardId: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent card selection when clicking badge
    
    // Find the bucket and card
    const bucketIndex = buckets.findIndex(b => b.id === bucketId)
    if (bucketIndex === -1) return
    
    const cardIndex = buckets[bucketIndex].cards.findIndex(c => c.id === cardId)
    if (cardIndex === -1) return
    
    const originalCard = buckets[bucketIndex].cards[cardIndex]
    
    // Calculate total stack size
    const totalStack = originalCard.owned + originalCard.unowned
    
    // Don't split if stack is only 1 card
    if (totalStack <= 1) return
    
    // Determine which count to decrement based on card ownership
    let newCard: CardStack
    if (originalCard.isOwned && originalCard.owned > 0) {
      // Decrement owned count
      newCard = {
        ...originalCard,
        owned: originalCard.owned - 1
      }
    } else if (!originalCard.isOwned && originalCard.unowned > 0) {
      // Decrement unowned count
      newCard = {
        ...originalCard,
        unowned: originalCard.unowned - 1
      }
    } else {
      // Fallback: decrement whichever is non-zero
      if (originalCard.owned > 0) {
        newCard = {
          ...originalCard,
          owned: originalCard.owned - 1
        }
      } else if (originalCard.unowned > 0) {
        newCard = {
          ...originalCard,
          unowned: originalCard.unowned - 1
        }
      } else {
        return // Nothing to decrement
      }
    }
    
    // Update the original card to have decremented count
    const updatedCard: CardStack = { ...originalCard }
    if (originalCard.isOwned) {
      updatedCard.owned = Math.max(0, originalCard.owned - 1)
    } else {
      updatedCard.unowned = Math.max(0, originalCard.unowned - 1)
    }
    
    // Insert new card right after the original card (as a single card)
    const newBuckets = [...buckets]
    const newCards = [...newBuckets[bucketIndex].cards]
    newCards[cardIndex] = updatedCard
    newCards.splice(cardIndex + 1, 0, {
      ...originalCard,
      id: `${originalCard.id}-copy-${Date.now()}`,
      owned: originalCard.isOwned ? 1 : 0,
      unowned: originalCard.isOwned ? 0 : 1
    })
    
    newBuckets[bucketIndex] = {
      ...newBuckets[bucketIndex],
      cards: newCards
    }
    
    setBuckets(newBuckets)
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

  const handleDropToCard = (e: React.DragEvent, targetBucketId: string, targetCardId: string) => {
    e.preventDefault()
    e.stopPropagation()

    // Parse the card IDs from dataTransfer
    let cardIds: string[] = []
    try {
      const data = e.dataTransfer.getData('text/plain')
      cardIds = JSON.parse(data)
    } catch {
      if (draggedCardId) {
        cardIds = [draggedCardId]
      } else {
        console.error('No card ID found in drop event')
        return
      }
    }

    if (cardIds.length === 0 || cardIds.includes(targetCardId)) {
      return // Don't merge if dropping same card
    }

    // Build a map of all cards
    const cardMap = new Map<string, { card: CardStack; bucketId: string }>()
    buckets.forEach((bucket) => {
      bucket.cards.forEach((card) => {
        cardMap.set(card.id, { card, bucketId: bucket.id })
      })
    })

    const targetCardData = cardMap.get(targetCardId)
    if (!targetCardData) return

    const targetCard = targetCardData.card

    // Get the cards being dropped
    const sourceCards = cardIds
      .map((id) => cardMap.get(id))
      .filter((data): data is { card: CardStack; bucketId: string } => data !== undefined)

    // Check if all source cards have the same name as target (for merging)
    const allSameName = sourceCards.every((s) => s.card.name === targetCard.name)

    if (!allSameName) {
      // If names don't match, just move them to the bucket (original behavior)
      handleDropToBucket(e, targetBucketId)
      return
    }

    // Merge cards: combine counts and remove source cards
    setBuckets((prev) =>
      prev.map((bucket) => {
        // Remove source cards from all buckets
        const updatedCards = bucket.cards.filter((c) => !cardIds.includes(c.id))

        // If this is the target bucket, update the target card with merged counts
        if (bucket.id === targetBucketId) {
          return {
            ...bucket,
            cards: updatedCards.map((card) => {
              if (card.id === targetCardId) {
                // Sum up the counts from all source cards
                const totalOwned = sourceCards.reduce((sum, s) => sum + s.card.owned, card.owned)
                const totalUnowned = sourceCards.reduce((sum, s) => sum + s.card.unowned, card.unowned)
                return {
                  ...card,
                  owned: totalOwned,
                  unowned: totalUnowned,
                }
              }
              return card
            }),
          }
        }

        return {
          ...bucket,
          cards: updatedCards,
        }
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
    <div className="h-screen w-full flex flex-col bg-gray-100">
      {/* Filters - fixed header */}
      <div className="flex-shrink-0 border-b bg-white p-4">
        <FilterButtons
          filters={filters}
          onFilterChange={handleFilterChange}
          onBulkSelect={handleBulkSelect}
          onDeselectAll={handleDeselectAll}
        />
      </div>

      {/* Main content area - flex-1 with min-h-0 for proper scrolling */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4">
        {/* Instructions Section */}
        <div className="flex-shrink-0 bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-lg font-bold text-blue-900 mb-2">How to Use This Organizer</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
              <div>
                <p className="font-semibold mb-1">Card Management:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Click cards to select them</li>
                  <li>Use filters to select multiple cards</li>
                  <li>Drag cards between buckets to organize them</li>
                  <li>Click the number badge to split a card into 2 copies (reduces stack by 1)</li>
                  <li>Drag a card onto another card of the same name to merge stacks</li>
                  
                </ul>
              </div>
              <div>
                <p className="font-semibold mb-1">Bucket Operations:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  
                  <li>Create custom buckets by clicking the add button on the right</li>
                  <li>Delete custom buckets (cards move back to Owned/Unowned)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Buckets Grid - Dynamic 2-column layout with add button on right */}
        <div className="w-full space-y-4">
          {/* Main buckets container - 2-column grid */}
          <div className="grid grid-cols-2 gap-4 w-full">
            {buckets.map((bucket, index) => {
              const bucketCardCount = bucket.cards.reduce((sum, c) => sum + c.owned + c.unowned, 0)
              const visibleCards = bucket.cards.filter((c) => filteredCardIds.has(c.id))
              const uniqueCardNames = new Set(bucket.cards.map((c) => c.name)).size

              // Color gradient for bucket headers - cycles through different colors
              const colors = [
                'from-blue-500 to-indigo-600',
                'from-purple-500 to-pink-600',
                'from-green-500 to-teal-600',
                'from-orange-500 to-red-600',
                'from-cyan-500 to-blue-600',
                'from-rose-500 to-pink-600',
                'from-emerald-500 to-green-600',
                'from-amber-500 to-orange-600',
              ]
              const headerColor = colors[index % colors.length]

              return (
                <div
                  key={bucket.id}
                  className="bg-white rounded-lg shadow-md flex flex-col overflow-hidden border-2 border-gray-200 min-h-[600px]"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropToBucket(e, bucket.id)}
                >
                  {/* Header */}
                  <div className={`bg-gradient-to-r ${headerColor} text-white p-4 space-y-2 flex-shrink-0`}>
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
                      <div className="space-y-2">
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
                              {bucketCardCount} total cards ({uniqueCardNames} different names)
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
                        {/* Export Buttons */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handlePrintBucket(bucket.id, bucket.name)}
                            disabled={bucket.cards.length === 0 || generatingPdfId === bucket.id}
                            className="flex-1 bg-white bg-opacity-20 hover:bg-opacity-30 disabled:bg-opacity-10 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded text-sm font-semibold transition-colors flex items-center justify-center gap-2"
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
                              'Export PDF'
                            )}
                          </button>
                          <button
                            onClick={() => handleExportText(bucket.id, bucket.name)}
                            disabled={bucket.cards.length === 0}
                            className="flex-1 bg-white bg-opacity-20 hover:bg-opacity-30 disabled:bg-opacity-10 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded text-sm font-semibold transition-colors"
                          >
                            Export Text
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Cards Grid */}
                  <div className="flex-1 p-4 bg-gray-50">
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
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDropToCard(e, bucket.id, card.id)}
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
                                <div 
                                  onClick={(e) => handleInstantiateCard(bucket.id, card.id, e)}
                                  className="absolute top-[12%] right-[5%] bg-black bg-opacity-75 text-white px-[6%] py-[3%] rounded font-bold z-10 whitespace-nowrap cursor-pointer hover:bg-opacity-90 transition-all" 
                                  style={{ fontSize: '0.85em' }}
                                  title="Click to instantiate a new copy"
                                >
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
                </div>
              )
            })}
          </div>

        </div>
      </div>

      {/* Add Bucket Button - fixed overlay in bottom right */}
      <button
        onClick={handleAddBucket}
        className="fixed bottom-6 right-6 w-16 h-16 bg-blue-600 hover:bg-blue-700 rounded-full shadow-lg hover:shadow-xl flex items-center justify-center text-white font-bold text-3xl transition-all z-50"
        title="Add New Bucket"
      >
        +
      </button>
    </div>
  )
}
