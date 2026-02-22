import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAnalysis } from '../hooks/useAnalysis.js'
import { countries } from '../constants/countries.js'
import { getSavedAnalyses, removeSavedAnalysis } from '../utils/savedAnalyses.js'
import { buildReportFilename, buildReportText, downloadReportText } from '../utils/reportExport.js'

const formatDateTime = (value) => {
  if (!value) return 'Unknown'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  }).format(Number(value || 0))

const countryNameByCode = (code) =>
  countries.find((country) => country.code === String(code || '').toUpperCase())?.name || code

export default function SavedAnalysis() {
  const navigate = useNavigate()
  const { setAnalysisPayload, setTradeRoute, setReport } = useAnalysis()
  const [savedItems, setSavedItems] = useState(() => getSavedAnalyses())
  const [feedback, setFeedback] = useState('')

  const refreshSaved = () => {
    setSavedItems(getSavedAnalyses())
  }

  useEffect(() => {
    const onStorage = () => refreshSaved()
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const handleOpenAnalysis = (item) => {
    setAnalysisPayload({
      analysis_id: item.analysis?.analysis_id,
      product_name: item.analysis?.product_name || null,
      hs_code: item.analysis?.hs_code,
      confidence: item.analysis?.confidence,
      explanation: item.analysis?.explanation || '',
      resolved_description: item.analysis?.resolved_description || '',
      manufacturing_country: item.analysis?.manufacturing_country,
      destination_country: item.analysis?.destination_country,
      declared_value: item.analysis?.declared_value,
      materials: item.materials || [],
      tariff_summary: item.tariffSummary || null,
      risk_score: item.riskScore ?? null,
      map_flow: item.tradeRoute || null,
      recent_insights: item.recentInsights || [],
      shipping_options: item.shippingOptions || [],
      compliance_checks: item.complianceChecks || []
    })
    setTradeRoute(item.tradeRoute || null)
    setReport(item.report || null)
    navigate('/results')
  }

  const handleDeleteAnalysis = (analysisId) => {
    removeSavedAnalysis(analysisId)
    refreshSaved()
    setFeedback('Saved analysis removed.')
  }

  const handleExportSaved = (item) => {
    const filename = buildReportFilename(item.analysis?.analysis_id)
    const reportText = buildReportText({
      analysis: item.analysis,
      materials: item.materials || [],
      tariffSummary: item.tariffSummary,
      riskScore: item.riskScore,
      report: item.report || null,
      recentInsights: item.recentInsights || [],
      shippingOptions: item.shippingOptions || [],
      complianceChecks: item.complianceChecks || []
    })
    downloadReportText(filename, reportText)
    setFeedback('Report exported from saved analysis.')
  }

  return (
    <div className="space-y-10">
      <section className="glass-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="label">Saved Analysis</p>
            <h2 className="section-title">Your Intelligence Library</h2>
          </div>
          <Link className="button-secondary" to="/new">
            New analysis
          </Link>
        </div>
        <p className="mt-3 text-sm text-[color:var(--text-muted)]">
          Reopen saved runs, export reports again, or remove outdated items.
        </p>
        {feedback && <p className="mt-3 text-xs text-[color:var(--text-muted)]">{feedback}</p>}
      </section>

      {savedItems.length === 0 && (
        <section className="glass-panel p-6">
          <h3 className="section-title">No saved analyses yet</h3>
          <p className="mt-2 text-sm text-[color:var(--text-muted)]">
            Run an analysis, then click "Save analysis" on the results page.
          </p>
          <div className="mt-4">
            <Link className="button-primary" to="/analysis">
              Start analysis
            </Link>
          </div>
        </section>
      )}

      {savedItems.length > 0 && (
        <section className="grid gap-6 lg:grid-cols-2">
          {savedItems.map((item) => (
            <div key={item.analysis.analysis_id} className="glass-panel p-6">
              <p className="label">HS {item.analysis?.hs_code || 'N/A'}</p>
              <h3 className="section-title mt-1">{item.analysis?.product_name || 'Unnamed Product'}</h3>
              <p className="mt-2 text-sm text-[color:var(--text-muted)]">
                {countryNameByCode(item.analysis?.manufacturing_country)} to{' '}
                {countryNameByCode(item.analysis?.destination_country)}
              </p>
              <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                Declared Value: {formatCurrency(item.analysis?.declared_value || 0)}
              </p>
              <p className="mt-1 text-sm text-[color:var(--text-muted)]">
                Saved: {formatDateTime(item.saved_at)}
              </p>
              <p className="mt-1 text-xs text-[color:var(--text-muted)]">
                Analysis ID: {item.analysis?.analysis_id}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <button className="button-primary" type="button" onClick={() => handleOpenAnalysis(item)}>
                  Open
                </button>
                <button className="button-secondary" type="button" onClick={() => handleExportSaved(item)}>
                  Export
                </button>
                <button
                  className="button-secondary"
                  type="button"
                  onClick={() => handleDeleteAnalysis(item.analysis.analysis_id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
