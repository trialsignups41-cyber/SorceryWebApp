import { useState } from 'react'
import { InputForm } from './components/InputForm'
import { DeckEditor } from './components/DeckEditor'
import { EnrichedDeckResponse } from './types'

function App() {
  const [currentScreen, setCurrentScreen] = useState<'input' | 'editor'>('input')
  const [deckData, setDeckData] = useState<EnrichedDeckResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleFormSuccess = (data: EnrichedDeckResponse) => {
    setDeckData(data)
    setCurrentScreen('editor')
    setError('')
    setIsLoading(false)
  }

  const handleFormError = (errorMessage: string) => {
    setError(errorMessage)
    setIsLoading(false)
  }

  const handleGoBack = () => {
    setCurrentScreen('input')
    setDeckData(null)
    setError('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Input Form Screen */}
        {currentScreen === 'input' && (
          <InputForm
            onSuccess={handleFormSuccess}
            onError={handleFormError}
            isLoading={isLoading}
          />
        )}

        {/* Deck Editor Screen */}
        {currentScreen === 'editor' && deckData && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-4xl font-bold text-gray-800">Deck Editor</h1>
                <p className="text-lg text-gray-600">{deckData.deck_name}</p>
              </div>
              <button
                onClick={handleGoBack}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                ← Back
              </button>
            </div>

            <DeckEditor
              cards={deckData.decklist}
              deckName={deckData.deck_name}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default App
