import { CardStack } from '../types'

interface CardGridProps {
  cards: CardStack[]
  selectedIds: Set<string>
  onSelectCard: (id: string) => void
  onDragStart: (e: React.DragEvent, cardId: string) => void
}

export function CardGrid({
  cards,
  selectedIds,
  onSelectCard,
  onDragStart,
}: CardGridProps) {
  if (cards.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No cards to display</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {cards.map((stack) => (
        <div
          key={stack.id}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = 'move'
            e.dataTransfer.setData('text/plain', stack.id)
            onDragStart(e, stack.id)
          }}
          className={`relative group cursor-move rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all transform hover:scale-105 ${
            selectedIds.has(stack.id) ? 'ring-4 ring-blue-400' : ''
          }`}
        >
          {/* Card Image */}
          <div className="relative w-full aspect-[63/88] bg-gray-300">
            {stack.image_url ? (
              <img
                src={stack.image_url}
                alt={stack.name}
                className={`w-full h-full object-cover ${
                  stack.isOwned ? '' : 'opacity-60'
                }`}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-gray-600 font-semibold bg-gray-400">
                No Image
              </div>
            )}

            {/* Quantity Badge */}
            {(stack.owned > 0 || stack.unowned > 0) && (
              <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-sm font-bold">
                {stack.owned > 0 && stack.unowned > 0
                  ? `${stack.owned}+${stack.unowned}`
                  : stack.owned > 0
                    ? stack.owned
                    : stack.unowned}
              </div>
            )}

            {/* Selection Checkbox */}
            <input
              type="checkbox"
              checked={selectedIds.has(stack.id)}
              onChange={() => onSelectCard(stack.id)}
              onClick={(e) => e.stopPropagation()}
              className="absolute top-2 left-2 w-5 h-5 cursor-pointer accent-blue-500"
            />

            {/* Drag Indicator - Only show on hover */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-center font-semibold drop-shadow-lg text-sm">
                Drag to bucket
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
