import { EnrichedDeckResponse } from '../types'

// Determine API base URL - use /api prefix for Vite proxy, or direct URL for production
const API_BASE = '/api'

export async function generateProxies(
  collectionFile: File | undefined,
  deckUrl: string,
  deckName: string
): Promise<EnrichedDeckResponse> {
  const formData = new FormData()
  
  // If no collection file provided, create an empty CSV with proper headers
  if (collectionFile) {
    formData.append('curiosa_export', collectionFile)
  } else {
    // Create a Curiosa-compatible CSV with headers but no cards
    const emptyCSV = 'card name,quantity,set,finish\n'
    const blob = new Blob([emptyCSV], { type: 'text/csv' })
    const emptyFile = new File([blob], 'empty_collection.csv', { type: 'text/csv' })
    formData.append('curiosa_export', emptyFile)
  }
  
  formData.append('deck_link', deckUrl)
  formData.append('deck_name', deckName)

  const response = await fetch(`${API_BASE}/generate-proxies`, {
    method: 'POST',
    body: formData,
  })

  const contentType = response.headers.get('content-type')
  
  if (!response.ok) {
    let errorMessage = 'Failed to generate proxies'
    if (contentType?.includes('application/json')) {
      try {
        const error = await response.json()
        errorMessage = error.error || error.message || errorMessage
      } catch {
        errorMessage = `Server error: ${response.statusText}`
      }
    } else {
      errorMessage = `Server error: ${response.statusText}`
    }
    throw new Error(errorMessage)
  }

  if (!contentType?.includes('application/json')) {
    throw new Error('Invalid response format from server')
  }

  return response.json()
}

export async function printBucket(cards: Array<{ name: string; quantity: number }>, deckName: string): Promise<Blob> {
  const response = await fetch(`${API_BASE}/print-bucket`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      cards,
      deck_name: deckName,
    }),
  })

  const contentType = response.headers.get('content-type')

  if (!response.ok) {
    let errorMessage = 'Failed to generate PDF'
    if (contentType?.includes('application/json')) {
      try {
        const error = await response.json()
        errorMessage = error.error || error.message || errorMessage
      } catch {
        errorMessage = `Server error: ${response.statusText}`
      }
    } else {
      errorMessage = `Server error: ${response.statusText}`
    }
    throw new Error(errorMessage)
  }

  return response.blob()
}

export function downloadPDF(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(a)
}
