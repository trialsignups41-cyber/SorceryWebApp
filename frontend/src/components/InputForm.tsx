import { useState } from 'react'
import { generateProxies } from '../utils/api'
import { EnrichedDeckResponse } from '../types'

interface InputFormProps {
  onSuccess: (data: EnrichedDeckResponse) => void
  onError: (error: string) => void
  isLoading: boolean
}

export function InputForm({ onSuccess, onError, isLoading }: InputFormProps) {
  const [collectionFile, setCollectionFile] = useState<File | null>(null)
  const [deckUrl, setDeckUrl] = useState('')
  const [deckName, setDeckName] = useState('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setCollectionFile(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!collectionFile) {
      onError('Please upload your collection file')
      return
    }

    if (!deckUrl.trim()) {
      onError('Please enter a deck URL')
      return
    }

    try {
      const result = await generateProxies(
        collectionFile,
        deckUrl,
        deckName || 'Unnamed Deck'
      )
      onSuccess(result)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Sorcery Proxy Tool</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Collection File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Collection File (Curiosa Export CSV)
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
            required
          />
          {collectionFile && (
            <p className="text-sm text-green-600 mt-1">✓ {collectionFile.name}</p>
          )}
        </div>

        {/* Deck URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Deck URL (Curiosa Link)
          </label>
          <input
            type="url"
            value={deckUrl}
            onChange={(e) => setDeckUrl(e.target.value)}
            placeholder="https://curiosa.io/decks/view/..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
            required
          />
        </div>

        {/* Deck Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Deck Name (Optional)
          </label>
          <input
            type="text"
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            placeholder="My Awesome Deck"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 text-white font-medium py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Processing...' : 'Generate Proxies'}
        </button>
      </form>
    </div>
  )
}
