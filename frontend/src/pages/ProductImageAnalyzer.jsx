import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ImageUploadField from '../components/ImageUploadField.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import ErrorState from '../components/ErrorState.jsx'
import { useAnalysis } from '../hooks/useAnalysis.js'
import { countries } from '../constants/countries.js'

const normalizeImageName = (fileName) => {
  const raw = String(fileName || '').replace(/\.[^.]+$/, '').trim()
  const compact = raw.replace(/[_-]+/g, ' ').trim()
  return compact.length >= 2 ? compact : 'Uploaded Product'
}

const countryNameByCode = (code) =>
  countries.find((country) => country.code === String(code || '').toUpperCase())?.name || code

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

export default function ProductImageAnalyzer() {
  const navigate = useNavigate()
  const { runAnalysis, setTradeRoute, loading, error, setError } = useAnalysis()
  const [form, setForm] = useState({
    product_name: '',
    description: '',
    manufacturing_country: 'US',
    destination_country: 'DE',
    declared_value: 1000
  })
  const [imageData, setImageData] = useState(null)
  const [localError, setLocalError] = useState('')

  const onChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const onSubmit = async (event) => {
    event.preventDefault()
    setLocalError('')
    setError(null)

    const normalizedDescription = String(form.description || '').trim()

    if (!normalizedDescription && !imageData?.base64) {
      setLocalError('Enter a description or upload an image.')
      return
    }

    if (!imageData?.base64 && normalizedDescription && normalizedDescription.length < 5) {
      setLocalError('Description must be at least 5 characters when no image is uploaded.')
      return
    }

    const typedName = String(form.product_name || '').trim()
    const inferredName = imageData?.fileName ? normalizeImageName(imageData.fileName) : ''
    const productName = typedName.length >= 2 ? typedName : inferredName || 'Uploaded Product'

    const payload = {
      product_name: productName,
      description:
        imageData?.base64 && normalizedDescription.length < 5
          ? undefined
          : normalizedDescription || undefined,
      image_base64: imageData?.base64 || undefined,
      image_mime_type: imageData?.mimeType || undefined,
      manufacturing_country: String(form.manufacturing_country || 'US').toUpperCase(),
      destination_country: String(form.destination_country || 'DE').toUpperCase(),
      declared_value: Number(form.declared_value)
    }

    if (!(payload.declared_value > 0)) {
      setLocalError('Declared value must be greater than zero.')
      return
    }

    try {
      const result = await runAnalysis(payload)
      setTradeRoute(buildRouteFromAnalysis(result, payload))
      navigate('/results')
    } catch {
      // Context error state is rendered below.
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
      <section className="glass-panel p-6">
        <h2 className="section-title">Product Image Analyzer</h2>
        <p className="mt-2 text-sm text-[color:var(--text-muted)]">
          Upload a product image and optionally add a description. You will be redirected to the
          full results view after analysis.
        </p>

        <form className="mt-6 space-y-6" onSubmit={onSubmit}>
          <div>
            <label className="label">Product Name (optional)</label>
            <input
              className="input mt-2"
              name="product_name"
              value={form.product_name}
              onChange={onChange}
              placeholder="e.g., Polyester sports jacket"
            />
          </div>

          <div>
            <label className="label">Description (optional with image)</label>
            <textarea
              className="input mt-2 min-h-[120px]"
              name="description"
              value={form.description}
              onChange={onChange}
              placeholder="Describe materials, intended use, and construction details..."
            />
          </div>

          <ImageUploadField loading={loading} onImageChange={setImageData} />

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label">Manufacturing Country</label>
              <select
                className="input mt-2"
                name="manufacturing_country"
                value={form.manufacturing_country}
                onChange={onChange}
              >
                {countries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name} ({country.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Destination Country</label>
              <select
                className="input mt-2"
                name="destination_country"
                value={form.destination_country}
                onChange={onChange}
              >
                {countries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name} ({country.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Declared Value (USD)</label>
            <input
              className="input mt-2"
              type="number"
              step="0.01"
              min="0.01"
              name="declared_value"
              value={form.declared_value}
              onChange={onChange}
            />
          </div>

          <button className="button-primary w-full" type="submit" disabled={loading}>
            {loading ? 'Analyzing...' : 'Analyze Product'}
          </button>
        </form>

        {loading && (
          <div className="mt-6">
            <LoadingSpinner label="Running AI analysis" />
          </div>
        )}
        {localError && (
          <div className="mt-6">
            <ErrorState title="Validation failed" message={localError} />
          </div>
        )}
        {error && (
          <div className="mt-6">
            <ErrorState title="Analysis failed" message={error.message || 'Failed to analyze product.'} />
          </div>
        )}
      </section>

      <section className="space-y-6">
        <div className="glass-panel p-6">
          <h3 className="section-title">What You Get</h3>
          <div className="list-stack mt-4">
            <div>
              <p className="list-title">HS Classification</p>
              <p className="list-sub">AI-generated HS code with confidence and explanation.</p>
            </div>
            <div>
              <p className="list-title">Duty and Risk</p>
              <p className="list-sub">Tariff exposure and risk score for the selected trade lane.</p>
            </div>
            <div>
              <p className="list-title">Save + Export</p>
              <p className="list-sub">
                In the results screen, save the analysis and export a report file.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
