import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  timeout: 120000
})

const unwrap = (response) => {
  if (!response?.data?.success) {
    const apiError = response?.data?.error
    const message =
      typeof apiError === 'string' ? apiError : apiError?.message || 'Unexpected API response'
    throw new Error(message)
  }
  return response.data
}

export const analyzeProduct = async (payload) => {
  const response = await api.post('/analyze', payload)
  return unwrap(response)
}

export const recalculateTariffs = async (payload) => {
  const response = await api.post('/recalculate', payload)
  return unwrap(response)
}

export const generateReport = async (payload) => {
  const response = await api.post('/generate-report', payload)
  return unwrap(response)
}

export default api