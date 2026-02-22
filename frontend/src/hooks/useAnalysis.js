import { useContext, useCallback } from 'react'
import { AnalysisContext } from '../context/AnalysisContext.jsx'
import { analyzeProduct, generateReport, recalculateTariffs } from '../services/api.js'

export const useAnalysis = () => {
  const context = useContext(AnalysisContext)
  if (!context) {
    throw new Error('useAnalysis must be used within AnalysisProvider')
  }

  const runAnalysis = useCallback(
    async (payload) => {
      context.setLoading(true)
      context.setError(null)
      try {
        const response = await analyzeProduct(payload)
        context.setAnalysisPayload({
          ...response.data,
          product_name: payload.product_name,
          input_description: payload.description
        })
        return response.data
      } catch (error) {
        context.setError(error)
        throw error
      } finally {
        context.setLoading(false)
      }
    },
    [context]
  )

  const recalculate = useCallback(
    async (analysisId, materials) => {
      context.setLoading(true)
      context.setError(null)
      try {
        const response = await recalculateTariffs({ analysis_id: analysisId, materials })
        context.updateResults({
          tariffSummary: response.data.tariff_summary,
          riskScore: response.data.risk_score,
          mapFlow: response.data.map_flow
        })
        context.updateMaterials(materials)
        return response.data
      } catch (error) {
        context.setError(error)
        throw error
      } finally {
        context.setLoading(false)
      }
    },
    [context]
  )

  const fetchReport = useCallback(
    async (analysisId) => {
      context.setLoading(true)
      context.setError(null)
      try {
        const response = await generateReport({ analysis_id: analysisId })
        context.setReport(response.data)
        return response.data
      } catch (error) {
        context.setError(error)
        throw error
      } finally {
        context.setLoading(false)
      }
    },
    [context]
  )

  return {
    ...context,
    runAnalysis,
    recalculate,
    fetchReport
  }
}
