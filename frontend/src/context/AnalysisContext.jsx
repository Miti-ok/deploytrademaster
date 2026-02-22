import { createContext, useCallback, useMemo, useState } from 'react'

export const AnalysisContext = createContext(null)

const initialState = {
  analysis: null,
  materials: [],
  tariffSummary: null,
  riskScore: null,
  mapFlow: null,
  report: null,
  tradeRoute: null,
  recentInsights: [],
  shippingOptions: [],
  complianceChecks: []
}

export const AnalysisProvider = ({ children }) => {
  const [state, setState] = useState(initialState)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const setAnalysisPayload = useCallback((payload) => {
    if (!payload) return
    setState((prev) => ({
      ...prev,
      analysis: {
        analysis_id: payload.analysis_id,
        product_name: payload.product_name || null,
        hs_code: payload.hs_code,
        confidence: payload.confidence,
        explanation: payload.explanation || '',
        resolved_description: payload.resolved_description || payload.input_description || '',
        manufacturing_country: payload.manufacturing_country,
        destination_country: payload.destination_country,
        declared_value: payload.declared_value
      },
      materials: payload.materials || [],
      tariffSummary: payload.tariff_summary || null,
      riskScore: payload.risk_score ?? null,
      mapFlow: payload.map_flow || null,
      recentInsights: payload.recent_insights || [],
      shippingOptions: payload.shipping_options || [],
      complianceChecks: payload.compliance_checks || [],
      report: null
    }))
  }, [])

  const updateMaterials = useCallback((materials) => {
    setState((prev) => ({ ...prev, materials }))
  }, [])

  const updateResults = useCallback(({ tariffSummary, riskScore, mapFlow }) => {
    setState((prev) => ({
      ...prev,
      tariffSummary: tariffSummary ?? prev.tariffSummary,
      riskScore: riskScore ?? prev.riskScore,
      mapFlow: mapFlow ?? prev.mapFlow
    }))
  }, [])

  const setReport = useCallback((report) => {
    setState((prev) => ({ ...prev, report }))
  }, [])

  const setTradeRoute = useCallback((tradeRoute) => {
    setState((prev) => ({ ...prev, tradeRoute }))
  }, [])

  const reset = useCallback(() => {
    setState(initialState)
    setError(null)
  }, [])

  const value = useMemo(
    () => ({
      ...state,
      loading,
      error,
      setLoading,
      setError,
      setAnalysisPayload,
      updateMaterials,
      updateResults,
      setReport,
      setTradeRoute,
      reset
    }),
    [state, loading, error, setAnalysisPayload, updateMaterials, updateResults, setReport, setTradeRoute, reset]
  )

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>
}
