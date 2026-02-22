import { useState } from 'react'

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_UPLOAD_MB = 6

export default function ImageUploadField({ loading, onImageChange }) {
  const [previewUrl, setPreviewUrl] = useState('')
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')

  const resetInput = (event) => {
    if (event?.target) {
      event.target.value = ''
    }
  }

  const handleFile = (event) => {
    const file = event.target.files?.[0]

    if (!file) {
      setPreviewUrl('')
      setFileName('')
      setError('')
      onImageChange?.(null)
      return
    }

    if (!file.type?.startsWith('image/')) {
      setPreviewUrl('')
      setFileName('')
      setError('Please upload an image file.')
      onImageChange?.(null)
      resetInput(event)
      return
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setPreviewUrl('')
      setFileName('')
      setError('Use JPG, PNG, WEBP, or GIF only.')
      onImageChange?.(null)
      resetInput(event)
      return
    }

    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setPreviewUrl('')
      setFileName('')
      setError(`Image must be ${MAX_UPLOAD_MB}MB or smaller.`)
      onImageChange?.(null)
      resetInput(event)
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        setError('Could not read the selected image.')
        onImageChange?.(null)
        resetInput(event)
        return
      }

      const [, base64] = result.split(',')
      if (!base64) {
        setError('Could not encode the selected image.')
        onImageChange?.(null)
        resetInput(event)
        return
      }

      setError('')
      setPreviewUrl(result)
      setFileName(file.name)
      onImageChange?.({
        base64,
        mimeType: file.type,
        fileName: file.name
      })
    }

    reader.onerror = () => {
      setError('Could not read the selected image.')
      onImageChange?.(null)
      resetInput(event)
    }

    reader.readAsDataURL(file)
  }

  return (
    <div>
      <label className="label">Reference Image (optional)</label>
      <input
        type="file"
        accept={ALLOWED_IMAGE_TYPES.join(',')}
        onChange={handleFile}
        className="file-upload mt-2 block w-full text-sm"
        disabled={loading}
      />

      {fileName && !error && (
        <p className="mt-2 text-xs text-[color:var(--text-muted)]">Loaded: {fileName}</p>
      )}

      {error && <p className="mt-2 text-sm text-ember">{error}</p>}

      {previewUrl && (
        <img
          src={previewUrl}
          alt="Uploaded product"
          className="mt-3 h-40 w-full rounded-xl border border-white/15 object-cover"
        />
      )}
    </div>
  )
}