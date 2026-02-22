import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { countries } from '../constants/countries.js'
import { isIso2, validateDeclaredValue } from '../utils/validators.js'
import ImageUploadField from './ImageUploadField.jsx'

const normalizeImageName = (fileName) => {
  const raw = String(fileName || '').replace(/\.[^.]+$/, '').trim()
  const compact = raw.replace(/[_-]+/g, ' ').trim()
  return compact.length >= 2 ? compact : 'Uploaded Product'
}

export default function ProductInputForm({ onSubmit, loading, apiKey, onApiKeyChange }) {
  const [imageData, setImageData] = useState(null)
  const [apiKeyError, setApiKeyError] = useState('')
  const {
    register,
    handleSubmit,
    watch,
    setError,
    clearErrors,
    formState: { errors }
  } = useForm({
    defaultValues: {
      product_name: '',
      description: '',
      manufacturing_country: 'US',
      destination_country: 'DE',
      declared_value: 1000
    }
  })

  const descriptionValue = watch('description')

  const countryOptions = useMemo(
    () =>
      countries.map((country) => (
        <option key={country.code} value={country.code}>
          {country.name} ({country.code})
        </option>
      )),
    []
  )

  const handleImageChange = (image) => {
    setImageData(image)
    if (image?.base64) {
      clearErrors('description')
      clearErrors('product_name')
    }
  }

  const submit = (data) => {
    if (!String(apiKey || '').trim()) {
      setApiKeyError('Groq API key is required.')
      return
    }
    setApiKeyError('')

    const normalizedDescription = String(data.description || '').trim()

    if (!normalizedDescription && !imageData?.base64) {
      setError('description', {
        type: 'manual',
        message: 'Description or image is required.'
      })
      return
    }

    if (!imageData?.base64 && normalizedDescription && normalizedDescription.length < 5) {
      setError('description', {
        type: 'manual',
        message: 'Description must be at least 5 characters.'
      })
      return
    }

    const typedName = String(data.product_name || '').trim()
    const inferredName = imageData?.fileName ? normalizeImageName(imageData.fileName) : ''
    const productName = typedName.length >= 2 ? typedName : inferredName || 'Uploaded Product'

    const descriptionForPayload =
      imageData?.base64 && normalizedDescription.length < 5
        ? undefined
        : normalizedDescription || undefined

    onSubmit({
      ...data,
      product_name: productName,
      description: descriptionForPayload,
      manufacturing_country: data.manufacturing_country.toUpperCase(),
      destination_country: data.destination_country.toUpperCase(),
      declared_value: Number(data.declared_value),
      image_base64: imageData?.base64 || undefined,
      image_mime_type: imageData?.mimeType || undefined
    })
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="glass-panel space-y-6 p-6">
      <div>
        <label className="label">Groq API Key</label>
        <input
          className="input mt-2"
          type="password"
          placeholder="gsk_..."
          value={apiKey || ''}
          onChange={(event) => {
            setApiKeyError('')
            onApiKeyChange?.(event.target.value)
          }}
        />
        <p className="mt-2 text-xs text-[color:var(--text-muted)]">
          Required for AI classification. Stored locally in this browser.
        </p>
        {apiKeyError && <p className="mt-2 text-sm text-ember">{apiKeyError}</p>}
      </div>

      <div>
        <label className="label">Product Name (optional with image upload)</label>
        <input
          className="input mt-2"
          {...register('product_name')}
          placeholder="e.g., Performance polyester jacket"
        />
        {errors.product_name && (
          <p className="mt-2 text-sm text-ember">{errors.product_name.message}</p>
        )}
      </div>

      <div>
        <label className="label">Description</label>
        <textarea
          className="input mt-2 min-h-[120px]"
          {...register('description')}
          placeholder="Describe materials, usage, and construction..."
        />
        {errors.description && (
          <p className="mt-2 text-sm text-ember">{errors.description.message}</p>
        )}
        {!descriptionValue && !imageData?.base64 && (
          <p className="mt-2 text-xs text-[color:var(--text-muted)]">
            Provide a description or upload an image.
          </p>
        )}
      </div>

      <ImageUploadField loading={loading} onImageChange={handleImageChange} />

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="label">Manufacturing Country</label>
          <select
            className="input mt-2"
            {...register('manufacturing_country', {
              validate: (value) => isIso2(value, countries) || 'Invalid ISO2 code.'
            })}
          >
            {countryOptions}
          </select>
        </div>
        <div>
          <label className="label">Destination Country</label>
          <select
            className="input mt-2"
            {...register('destination_country', {
              validate: (value) => isIso2(value, countries) || 'Invalid ISO2 code.'
            })}
          >
            {countryOptions}
          </select>
        </div>
      </div>

      <div>
        <label className="label">Declared Value (USD)</label>
        <input
          type="number"
          step="0.01"
          className="input mt-2"
          {...register('declared_value', {
            validate: (value) => validateDeclaredValue(value) || 'Value must be positive.'
          })}
        />
        {errors.declared_value && (
          <p className="mt-2 text-sm text-ember">{errors.declared_value.message}</p>
        )}
      </div>

      <button className="button-primary w-full" type="submit" disabled={loading}>
        {loading ? 'Analyzing...' : 'Run AI Classification'}
      </button>
    </form>
  )
}
