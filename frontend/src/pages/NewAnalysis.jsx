import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ProductInputForm from '../components/ProductInputForm.jsx'
import ErrorState from '../components/ErrorState.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import { useAnalysis } from '../hooks/useAnalysis.js'
import { countries } from '../constants/countries.js'

export default function NewAnalysis() {
  const navigate = useNavigate()
  const { loading, error, reset, setTradeRoute, runAnalysis } = useAnalysis()
  const [groqApiKey, setGroqApiKey] = useState('')

  useEffect(() => {
    const storedKey = window.localStorage.getItem('groq_api_key') || ''
    setGroqApiKey(storedKey)
  }, [])

  const handleGroqApiKeyChange = (value) => {
    const normalized = String(value || '').trim()
    setGroqApiKey(normalized)
    if (normalized) {
      window.localStorage.setItem('groq_api_key', normalized)
      return
    }
    window.localStorage.removeItem('groq_api_key')
  }

  const countryNameByCode = (code) =>
    countries.find((country) => country.code === code)?.name || code

  const normalizeCountryName = (country) => {
    const cleaned = String(country || '').trim()
    if (!cleaned) return 'Unknown'
    if (cleaned.length === 2) {
      return countryNameByCode(cleaned.toUpperCase())
    }
    return cleaned
  }

  const buildRouteFromAnalysis = (result, payload) => {
    if (Array.isArray(result?.map_flow) && result.map_flow.length >= 2) {
      return result.map_flow.map((entry) => ({
        ...entry,
        country: normalizeCountryName(entry.country),
        material: entry.material || payload.product_name || 'Trade shipment',
        hs_code: entry.hs_code || result.hs_code || '0000.00'
      }))
    }

    return [
      {
        country: countryNameByCode(payload.manufacturing_country),
        role: 'exporter',
        material: payload.product_name || 'Trade shipment',
        hs_code: result?.hs_code || '0000.00'
      },
      {
        country: countryNameByCode(payload.destination_country),
        role: 'importer',
        material: payload.product_name || 'Trade shipment',
        hs_code: result?.hs_code || '0000.00'
      }
    ]
  }

  const handleSubmit = async (payload) => {
    if (!payload) {
      return
    }

    try {
      const result = await runAnalysis({
        ...payload,
        groq_api_key: groqApiKey || undefined
      })
      setTradeRoute(buildRouteFromAnalysis(result, payload))
      navigate('/results')
    } catch {
      // Error state is handled by context and rendered in this page.
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
      <div>
        <h2 className="section-title">New Trade Analysis</h2>
        <p className="mt-2 text-sm text-[color:var(--text-muted)]">
          Provide product details to generate HS classification, duty estimation, and sourcing risk.
        </p>
        <div className="mt-6">
          <ProductInputForm
            apiKey={groqApiKey}
            loading={loading}
            onApiKeyChange={handleGroqApiKeyChange}
            onSubmit={handleSubmit}
          />
        </div>
      </div>
      <div className="space-y-6">
        <div className="glass-panel p-6">
          <h3 className="section-title">Groq API Setup</h3>
          <ol className="mt-4 space-y-3 text-sm text-[color:var(--text-muted)]">
            <li>1. Create an API key in your Groq dashboard and paste it into the input above.</li>
            <li>2. This key is stored only in your browser local storage and sent only during your analysis request.</li>
          </ol>
        </div>
        <div className="glass-panel p-6">
          <h3 className="section-title">Workflow</h3>
          <ol className="mt-4 space-y-3 text-sm text-[color:var(--text-muted)]">
            <li>1. Enter product specifications.</li>
            <li>2. Validate materials and origin mix.</li>
            <li>3. Review duty exposure and risk.</li>
          </ol>
          {loading && <div className="mt-6"><LoadingSpinner label="Running AI analysis" /></div>}
        </div>
        {error && (
          <ErrorState
            title="Analysis failed"
            message={error.message || 'Unable to complete the analysis.'}
            onRetry={reset}
          />
        )}
      </div>
    </div>
  )
}
