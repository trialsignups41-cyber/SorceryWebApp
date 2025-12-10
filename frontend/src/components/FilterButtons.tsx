import { useState } from 'react'
import { CardStack, FilterState } from '../types'

interface FilterButtonsProps {
  filters: FilterState
  onFilterChange: (filterKey: string) => void
  onBulkSelect: () => void
  onDeselectAll: () => void
  priceFilter: { enabled: boolean; type: 'above' | 'below'; value: number }
  onPriceFilterChange: (filter: { enabled: boolean; type: 'above' | 'below'; value: number }) => void
}

const RARITY_FILTERS = ['Unique', 'Elite', 'Exceptional', 'Ordinary']
const OWNERSHIP_FILTERS = ['Owned', 'Unowned']

export function FilterButtons({
  filters,
  onFilterChange,
  onBulkSelect,
  onDeselectAll,
  priceFilter,
  onPriceFilterChange,
}: FilterButtonsProps) {
  const [priceInput, setPriceInput] = useState(priceFilter.value.toString())
  const hasActiveFilters = Object.values(filters).some((v) => v) || priceFilter.enabled

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

        <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 ml-4">Price:</span>
        <button
          onClick={() => onPriceFilterChange({ 
            enabled: priceFilter.type === 'above' ? !priceFilter.enabled : true, 
            type: 'above', 
            value: parseFloat(priceInput) || 0 
          })}
          className={`filter-button ${priceFilter.enabled && priceFilter.type === 'above' ? 'active' : ''}`}
        >
          Above
        </button>
        <button
          onClick={() => onPriceFilterChange({ 
            enabled: priceFilter.type === 'below' ? !priceFilter.enabled : true, 
            type: 'below', 
            value: parseFloat(priceInput) || 0 
          })}
          className={`filter-button ${priceFilter.enabled && priceFilter.type === 'below' ? 'active' : ''}`}
        >
          Below
        </button>
        <input
          type="number"
          step="0.01"
          min="0"
          value={priceInput}
          onChange={(e) => {
            setPriceInput(e.target.value)
            const value = parseFloat(e.target.value)
            if (!isNaN(value)) {
              onPriceFilterChange({ ...priceFilter, value })
            }
          }}
          placeholder="0.00"
          className="w-24 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        />
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
