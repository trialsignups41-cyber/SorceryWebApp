import { CardStack, FilterState } from '../types'

interface FilterButtonsProps {
  filters: FilterState
  onFilterChange: (filterKey: string) => void
  onBulkSelect: () => void
  onDeselectAll: () => void
}

const RARITY_FILTERS = ['Unique', 'Elite', 'Exceptional', 'Ordinary']
const OWNERSHIP_FILTERS = ['Owned', 'Unowned']

export function FilterButtons({
  filters,
  onFilterChange,
  onBulkSelect,
  onDeselectAll,
}: FilterButtonsProps) {
  const hasActiveFilters = Object.values(filters).some((v) => v)

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-4 mb-4">
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Rarity:</span>
        {RARITY_FILTERS.map((filter) => (
          <button
            key={filter}
            onClick={() => onFilterChange(filter)}
            className={`filter-button ${filters[filter] ? 'active' : ''}`}
          >
            {filter}
          </button>
        ))}
        
        <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 ml-4">Ownership:</span>
        {OWNERSHIP_FILTERS.map((filter) => (
          <button
            key={filter}
            onClick={() => onFilterChange(filter)}
            className={`filter-button ${filters[filter] ? 'active' : ''}`}
          >
            {filter}
          </button>
        ))}
      </div>

      {hasActiveFilters && (
        <button
          onClick={onBulkSelect}
          className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 transition-colors"
        >
          Select All Matching
        </button>
      )}

      <button
        onClick={onDeselectAll}
        className="text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 transition-colors ml-2"
      >
        Deselect All
      </button>
    </div>
  )
}
