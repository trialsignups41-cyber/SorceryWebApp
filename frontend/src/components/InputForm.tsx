import { useState, useEffect } from 'react'
import { generateProxies } from '../utils/api'
import { EnrichedDeckResponse } from '../types'

interface InputFormProps {
  onSuccess: (data: EnrichedDeckResponse, collectionData: { filename: string; content: string }) => void
  onError: (error: string) => void
  onLoadingChange: (loading: boolean) => void
  isLoading: boolean
  savedCollectionData?: { filename: string; content: string }
}

export function InputForm({ onSuccess, onError, onLoadingChange, isLoading, savedCollectionData }: InputFormProps) {
  const [collectionFile, setCollectionFile] = useState<File | null>(null)
  const [deckUrl, setDeckUrl] = useState('')
  const [deckName, setDeckName] = useState('')

  // Load saved collection if provided
  useEffect(() => {
    if (savedCollectionData && savedCollectionData.content) {
      // Convert the saved collection data back to a File object
      const blob = new Blob([savedCollectionData.content], { type: 'text/csv' })
      const file = new File([blob], savedCollectionData.filename, { type: 'text/csv' })
      setCollectionFile(file)
    } else {
      // Clear the collection file if savedCollectionData is undefined or empty
      setCollectionFile(null)
    }
  }, [savedCollectionData])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setCollectionFile(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!deckUrl.trim()) {
      onError('Please enter a deck URL')
      return
    }

    onLoadingChange(true)
    try {
      const result = await generateProxies(
        collectionFile ?? undefined,
        deckUrl,
        deckName || 'Unnamed Deck'
      )
      onSuccess(result, collectionFile ? {
        filename: collectionFile.name,
        content: await collectionFile.text(),
      } : {
        filename: 'no_collection.csv',
        content: '',
      })
    } catch (err) {
      console.error('Form submission error:', err)
      onError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      onLoadingChange(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-2 text-gray-800 dark:text-gray-100">Sorcery Playtest Card Tool</h1>
      
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
          Enter a deck list to organize cards for printing. Optionally upload your collection to track owned vs. unowned cards. 
          Select and drag cards between buckets to organize your proxy sheets. 
          Generate PDFs with your custom organization, or export as text. Your progress is automatically saved in your browser.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Deck URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Deck URL (Curiosa Link)
          </label>
          <input
            type="url"
            value={deckUrl}
            onChange={(e) => setDeckUrl(e.target.value)}
            placeholder="https://curiosa.io/decks/view/..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            disabled={isLoading}
            required
          />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Paste any Curiosa deck link</p>
        </div>

        {/* Deck Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Deck Name (Optional)
          </label>
          <input
            type="text"
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            placeholder="My Awesome Deck"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            disabled={isLoading}
          />
        </div>

        {/* Collection File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Collection File (Optional - Curiosa Export CSV)
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            disabled={isLoading}
          />
          {collectionFile ? (
            <p className="text-sm text-green-600 dark:text-green-400 mt-1">✓ {collectionFile.name}</p>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">If no file is provided, all cards will be marked as unowned</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 text-white font-medium py-2 rounded-md hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Processing...' : 'Open Organizer'}
        </button>
      </form>
    </div>
  )
}
