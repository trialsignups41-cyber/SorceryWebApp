import { CardStack, Bucket } from '../types'
import { printBucket, downloadPDF } from '../utils/api'
import { useState } from 'react'

interface BucketPaneProps {
  bucket: Bucket
  cards: CardStack[]
  deckName: string
  onNameChange: (bucketId: string, newName: string) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, bucketId: string) => void
  onRemoveCard: (bucketId: string, cardId: string) => void
}

export function BucketPane({
  bucket,
  cards,
  deckName,
  onNameChange,
  onDragOver,
  onDrop,
  onRemoveCard,
}: BucketPaneProps) {
  const [isRenaming, setIsRenaming] = useState(false)
  const [newName, setNewName] = useState(bucket.name)
  const [isPrinting, setIsPrinting] = useState(false)

  const handleRenameSubmit = () => {
    if (newName.trim()) {
      onNameChange(bucket.id, newName.trim())
    }
    setIsRenaming(false)
  }

  const handlePrintBucket = async () => {
    try {
      setIsPrinting(true)
      const cardsForPdf = cards.map((card) => ({
        name: card.name,
        quantity: card.owned + card.unowned,
      }))

      const blob = await printBucket(cardsForPdf, deckName)
      downloadPDF(blob, `${bucket.name}_${deckName}.pdf`)
    } catch (error) {
      alert(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsPrinting(false)
    }
  }

  const handleExportText = () => {
    const text = cards
      .map((card) => `${card.name} x${card.owned + card.unowned}`)
      .join('\n')

    const blob = new Blob([text], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${bucket.name}_${deckName}.txt`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  const totalCards = cards.reduce((sum, c) => sum + c.owned + c.unowned, 0)

  return (
    <div
      className="bucket-pane flex flex-col"
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, bucket.id)}
    >
      {/* Header */}
      <div className="mb-4 pb-4 border-b">
        {isRenaming ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
              className="flex-1 px-2 py-1 border rounded text-sm"
            />
            <button
              onClick={handleRenameSubmit}
              className="px-2 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
            >
              Save
            </button>
          </div>
        ) : (
          <div
            onClick={() => setIsRenaming(true)}
            className="cursor-pointer hover:text-blue-600 transition-colors"
          >
            <h3 className="text-lg font-bold">{bucket.name}</h3>
            <p className="text-xs text-gray-500">{totalCards} cards</p>
          </div>
        )}
      </div>

      {/* Cards List */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-2">
        {cards.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">Drag cards here</p>
        ) : (
          cards.map((card) => (
            <div
              key={card.id}
              className="flex items-center justify-between bg-white p-2 rounded border text-sm"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{card.name}</p>
                <p className="text-xs text-gray-500">
                  {card.owned > 0 && (
                    <span className="text-owned">Owned: {card.owned}</span>
                  )}
                  {card.owned > 0 && card.unowned > 0 && ' | '}
                  {card.unowned > 0 && (
                    <span className="text-unowned">Unowned: {card.unowned}</span>
                  )}
                </p>
              </div>
              <button
                onClick={() => onRemoveCard(bucket.id, card.id)}
                className="ml-2 text-red-500 hover:text-red-700 font-bold"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      {/* Action Buttons */}
      {cards.length > 0 && (
        <div className="flex gap-2 pt-4 border-t">
          <button
            onClick={handlePrintBucket}
            disabled={isPrinting}
            className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            {isPrinting ? 'Generating...' : 'Print PDF'}
          </button>
          <button
            onClick={handleExportText}
            className="flex-1 bg-gray-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            Export Text
          </button>
        </div>
      )}
    </div>
  )
}
