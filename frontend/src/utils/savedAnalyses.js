const STORAGE_KEY = 'trademaster_saved_analyses_v1'

const canUseStorage = () => typeof window !== 'undefined' && !!window.localStorage

const normalizeItems = (raw) => {
  if (!Array.isArray(raw)) {
    return []
  }

  return raw
    .filter((item) => item?.analysis?.analysis_id)
    .sort((a, b) => new Date(b.saved_at || 0).getTime() - new Date(a.saved_at || 0).getTime())
}

export const getSavedAnalyses = () => {
  if (!canUseStorage()) {
    return []
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return []
    }
    return normalizeItems(JSON.parse(raw))
  } catch {
    return []
  }
}

const setSavedAnalyses = (items) => {
  if (!canUseStorage()) {
    return []
  }

  const normalized = normalizeItems(items)
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
  return normalized
}

export const upsertSavedAnalysis = (entry) => {
  if (!entry?.analysis?.analysis_id) {
    throw new Error('Analysis ID is required to save.')
  }

  const id = entry.analysis.analysis_id
  const current = getSavedAnalyses()
  const savedAt = new Date().toISOString()
  const nextEntry = { ...entry, saved_at: savedAt }
  const existingIndex = current.findIndex((item) => item.analysis?.analysis_id === id)

  if (existingIndex >= 0) {
    const merged = [...current]
    merged[existingIndex] = { ...merged[existingIndex], ...nextEntry }
    return setSavedAnalyses(merged)
  }

  return setSavedAnalyses([nextEntry, ...current])
}

export const removeSavedAnalysis = (analysisId) => {
  const next = getSavedAnalyses().filter((item) => item.analysis?.analysis_id !== analysisId)
  return setSavedAnalyses(next)
}
