import { useState, useEffect } from 'react'
import { InputForm } from './components/InputForm'
import { DeckEditor } from './components/DeckEditor'
import { EnrichedDeckResponse } from './types'

interface SavedCollectionData {
  filename: string
  content: string
}

function App() {
  const [currentScreen, setCurrentScreen] = useState<'input' | 'editor'>('input')
  const [deckData, setDeckData] = useState<EnrichedDeckResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [savedCollection, setSavedCollection] = useState<SavedCollectionData | undefined>()
  const [isEditingDeckName, setIsEditingDeckName] = useState(false)
  const [editingDeckName, setEditingDeckName] = useState('')

  // Load from localStorage on mount
  useEffect(() => {
    const savedDeckData = localStorage.getItem('deckData')
    if (savedDeckData) {
      try {
        const parsed = JSON.parse(savedDeckData)
        setDeckData(parsed)
        setCurrentScreen('editor')
      } catch (e) {
        console.error('Failed to load saved deck data:', e)
      }
    }

    // Load saved collection file
    const savedCollectionData = localStorage.getItem('collectionData')
    if (savedCollectionData) {
      try {
        setSavedCollection(JSON.parse(savedCollectionData))
      } catch (e) {
        console.error('Failed to load saved collection:', e)
      }
    }
  }, [])

  // Save to localStorage whenever deckData changes
  useEffect(() => {
    if (deckData) {
      localStorage.setItem('deckData', JSON.stringify(deckData))
    }
  }, [deckData])

  const handleFormSuccess = (data: EnrichedDeckResponse, collectionData: SavedCollectionData) => {
    setDeckData(data)
    // Save collection data for quick reuse
    localStorage.setItem('collectionData', JSON.stringify(collectionData))
    setSavedCollection(collectionData)
    setCurrentScreen('editor')
    setError('')
    setIsLoading(false)
  }

  const handleFormError = (errorMessage: string) => {
    setError(errorMessage)
    setIsLoading(false)
  }

  const handleReset = () => {
    localStorage.removeItem('deckData')
    setCurrentScreen('input')
    setDeckData(null)
    setError('')
    setIsEditingDeckName(false)
  }

  const handleEditDeckName = () => {
    setIsEditingDeckName(true)
    setEditingDeckName(deckData?.deck_name || '')
  }

  const handleSaveDeckName = () => {
    if (deckData && editingDeckName.trim()) {
      const updated = {
        ...deckData,
        deck_name: editingDeckName.trim(),
      }
      setDeckData(updated)
      setIsEditingDeckName(false)
    }
  }

  const handleCancelEditDeckName = () => {
    setIsEditingDeckName(false)
  }

  const handleClearAllData = () => {
    const confirmed = window.confirm(
      'Are you sure you want to clear all saved data?\n\nThis will delete:\n- Your saved deck\n- Your collection file\n- All bucket configurations\n- All card selections\n\nThis action cannot be undone.'
    )
    
    if (confirmed) {
      // Clear all localStorage
      localStorage.clear()
      
      // Reset app state
      setDeckData(null)
      setSavedCollection(undefined)
      setCurrentScreen('input')
      setError('')
      
      // Force InputForm to reset by clearing the savedCollectionData prop
      // The InputForm will see undefined and clear its file state
      
      alert('All data has been cleared successfully.')
    }
  }

  return (
    <div className="h-full w-full bg-gradient-to-br from-blue-50 to-indigo-100 overflow-hidden flex flex-col">
      {/* Input Form Screen - centered with full height */}
      {currentScreen === 'input' && (
        <div className="flex-1 flex flex-col overflow-auto">
          {/* Clear Data Button - top right */}
          <div className="flex justify-end p-4">
            <button
              onClick={handleClearAllData}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold text-sm"
            >
              Clear All Saved Data
            </button>
          </div>
          
          <div className="flex-1 flex items-center justify-center p-4">
            <InputForm
              onSuccess={handleFormSuccess}
              onError={handleFormError}
              onLoadingChange={setIsLoading}
              isLoading={isLoading}
              savedCollectionData={savedCollection}
            />
          </div>
        </div>
      )}

      {/* Deck Editor Screen - full viewport */}
        {currentScreen === 'editor' && deckData && (
          <div className="flex-1 flex flex-col bg-white">
            {/* Header with deck name and new deck button */}
            <div className="flex-shrink-0 border-b bg-white p-4 flex items-center justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-800">Deck Editor</h1>
                {isEditingDeckName ? (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      value={editingDeckName}
                      onChange={(e) => setEditingDeckName(e.target.value)}
                      autoFocus
                      className="px-3 py-1 border border-gray-300 rounded-md text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={handleSaveDeckName}
                      className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 font-semibold transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEditDeckNam