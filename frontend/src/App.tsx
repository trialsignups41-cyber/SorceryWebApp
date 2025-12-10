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
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved ? JSON.parse(saved) : true
  })

  // Apply dark mode class to document
  useEffect(() => {
    console.log('Dark mode toggled:', isDarkMode)
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
      console.log('Added dark class to:', document.documentElement.className)
    } else {
      document.documentElement.classList.remove('dark')
      console.log('Removed dark class, now:', document.documentElement.className)
    }
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode))
  }, [isDarkMode])

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
    <div className="h-full w-full bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 overflow-hidden flex flex-col">
      {/* Input Form Screen - centered with full height */}
      {currentScreen === 'input' && (
        <div className="flex-1 flex flex-col overflow-auto">
          {/* Top bar with dark mode toggle and clear data button */}
          <div className="flex justify-end items-center gap-2 p-4">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-lg bg-white dark:bg-gray-700 shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200 dark:border-gray-600"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? (
                <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
            <button
              onClick={handleClearAllData}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors font-semibold text-sm"
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
          <div className="flex-1 flex flex-col bg-white dark:bg-gray-900">
            {/* Header with deck name and new deck button */}
            <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 flex items-center justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Deck Editor</h1>
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
                      onClick={handleCancelEditDeckName}
                      className="px-3 py-1 bg-gray-400 text-white rounded-md hover:bg-gray-500 font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <p
                    onClick={handleEditDeckName}
                    className="text-lg text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-800 dark:hover:text-gray-200 hover:underline transition-colors mt-1"
                  >
                    {deckData.deck_name} ✎
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 border border-gray-200 dark:border-gray-600"
                  title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                  {isDarkMode ? (
                    <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-gray-700 dark:text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 transition-colors font-semibold flex-shrink-0"
                >
                  + New Deck
                </button>
              </div>
            </div>

            {/* Deck Editor - flex-1 to take remaining space */}
            <div className="flex-1 min-h-0">
              <DeckEditor
                cards={deckData.decklist}
                deckName={deckData.deck_name}
              />
            </div>
          </div>
        )}
    </div>
  )
}

export default App
