import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAnalysis } from '../hooks/useAnalysis.js'
import TradeRouteGlobe from '../components/globe/TradeRouteGlobe.jsx'
import { countries } from '../constants/countries.js'
import { upsertSavedAnalysis } from '../utils/savedAnalyses.js'
import { buildReportFilename, buildReportText, downloadReportText } from '../utils/reportExport.js'

const toRiskLevel = (score) => {
  if (score >= 70) return 'High'
  if (score >= 40) return 'Medium'
  return 'Low'
}

const toTitleCase = (value) =>
  String(value || '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  }).format(Number(value || 0))

const formatPercent = (value) => `${Number(value || 0).toFixed(2)}%`

const countryNameByCode = (code) =>
  countries.find((country) => country.code === String(code || '').toUpperCase())?.name || code

const normalizeComplianceStatus = (status) => {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'pass' || normalized === 'warn' || normalized === 'action_required') {
    return normalized
  }
  return 'warn'
}

function InfoHint({ text }) {
  return (
    <span className="group relative inline-flex">
      <button
        aria-label={text}
        className="inline-flex h-5 w-5 shrink-0 cursor-help items-center justify-center rounded-full border border-white/35 bg-white/5 text-[11px] font-bold leading-none text-[color:var(--text-muted)] align-middle transition hover:border-white/60 hover:text-[color:var(--text)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
        type="button"
      >
        i
      </button>
      <span className="pointer-events-none absolute left-1/2 top-[130%] z-40 w-[260px] max-w-[80vw] -translate-x-1/2 rounded-md border border-[color:var(--tooltip-border)] bg-[color:var(--tooltip-bg)] px-3 py-2 text-left text-xs font-normal leading-5 text-[color:var(--tooltip-text)] opacity-0 shadow-2xl transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
        {text}
      </span>
    </span>
  )
}

function LabelWithInfo({ label, info }) {
  return (
    <p className="label flex items-center gap-2">
      <span>{label}</span>
      <InfoHint text={info} />
    </p>
  )
}

export default function Results() {
  const navigate = useNavigate()
  const {
    analysis,
    materials,
    tariffSummary,
    riskScore,
    tradeRoute,
    recentInsights,
    shippingOptions,
    complianceChecks,
    report,
    fetchReport
  } = useAnalysis()
  const [actionMessage, setActionMessage] = useState('')
  const [actionError, setActionError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const confidence = useMemo(() => Math.round((analysis?.confidence || 0) * 100), [analysis])
  const riskLevel = useMemo(() => toRiskLevel(Number(riskScore || 0)), [riskScore])

  const routeData = useMemo(() => {
    if (Array.isArray(tradeRoute) && tradeRoute.length >= 2) {
      return tradeRoute
    }

    if (!analysis?.manufacturing_country || !analysis?.destination_country) {
      return null
    }

    return [
      {
        country: countryNameByCode(analysis.manufacturing_country),
        role: 'exporter',
        material: materials?.[0]?.name || analysis.product_name || 'Trade shipment',
        hs_code: analysis.hs_code || '0000.00'
      },
      {
        country: countryNameByCode(analysis.destination_country),
        role: 'importer',
        material: materials?.[0]?.name || analysis.product_name || 'Trade shipment',
        hs_code: analysis.hs_code || '0000.00'
      }
    ]
  }, [tradeRoute, analysis, materials])

  const sortedMaterials = useMemo(
    () => [...(materials || [])].sort((a, b) => Number(b.percentage || 0) - Number(a.percentage || 0)),
    [materials]
  )

  const insightItems = useMemo(() => {
    if (Array.isArray(recentInsights) && recentInsights.length) {
      return recentInsights
    }

    return [
      {
        title: 'Duty impact signal',
        detail: `Estimated duty ${formatCurrency(tariffSummary?.estimated_duty_amount || 0)} on declared value ${formatCurrency(analysis?.declared_value || 0)}.`
      },
      {
        title: 'Risk outlook',
        detail: `Current risk is ${riskLevel.toLowerCase()} at ${Number(riskScore || 0).toFixed(2)} points.`
      },
      {
        title: 'Supply complexity',
        detail: `${sortedMaterials.length} material entries are contributing to the classification outcome.`
      }
    ]
  }, [recentInsights, tariffSummary, analysis, riskLevel, riskScore, sortedMaterials.length])

  const shippingItems = useMemo(() => {
    if (Array.isArray(shippingOptions) && shippingOptions.length) {
      return shippingOptions
    }

    const origin = countryNameByCode(analysis?.manufacturing_country)
    const destination = countryNameByCode(analysis?.destination_country)
    return [
      {
        mode: 'SEA',
        route: `${origin} -> ${destination}`,
        eta_days: 30,
        estimated_cost_usd: Math.max(1200, Number(analysis?.declared_value || 0) * 0.06),
        risk_level: 'Low',
        notes: 'Lower freight cost for large-volume shipment.'
      },
      {
        mode: 'AIR',
        route: `${origin} -> ${destination}`,
        eta_days: 8,
        estimated_cost_usd: Math.max(3200, Number(analysis?.declared_value || 0) * 0.18),
        risk_level: 'Medium',
        notes: 'Faster option for urgent or high-value cargo.'
      },
      {
        mode: 'INTERMODAL',
        route: `${origin} -> ${destination}`,
        eta_days: 18,
        estimated_cost_usd: Math.max(1800, Number(analysis?.declared_value || 0) * 0.1),
        risk_level: riskLevel,
        notes: 'Balanced transit time and freight spend.'
      }
    ]
  }, [shippingOptions, analysis, riskLevel])

  const complianceItems = useMemo(() => {
    if (Array.isArray(complianceChecks) && complianceChecks.length) {
      return complianceChecks
    }

    return [
      {
        item: 'HS code and tariff basis recorded',
        status: 'pass',
        note: `Classification recorded under HS ${analysis?.hs_code || 'N/A'}.`
      },
      {
        item: 'Material origin declarations',
        status: sortedMaterials.length ? 'pass' : 'warn',
        note: sortedMaterials.length
          ? 'Material origin list is present in this analysis response.'
          : 'No material lines were returned. Re-run analysis or edit materials.'
      },
      {
        item: 'Shipment documents pre-check',
        status: Number(tariffSummary?.total_duty_percent || 0) >= 15 ? 'warn' : 'pass',
        note: 'Verify invoice, packing list, and transport bill before booking.'
      }
    ]
  }, [complianceChecks, analysis, sortedMaterials.length, tariffSummary])

  const currentSnapshot = useMemo(
    () => ({
      analysis,
      materials: sortedMaterials,
      tariffSummary,
      riskScore: Number(riskScore || 0),
      tradeRoute: routeData || null,
      recentInsights: insightItems,
      shippingOptions: shippingItems,
      complianceChecks: complianceItems,
      report: report || null
    }),
    [
      analysis,
      sortedMaterials,
      tariffSummary,
      riskScore,
      routeData,
      insightItems,
      shippingItems,
      complianceItems,
      report
    ]
  )

  if (!analysis) {
    return (
      <div className="glass-panel p-8">
        <h2 className="section-title">No analysis results yet</h2>
        <p className="mt-3 text-sm text-[color:var(--text-muted)]">
          Upload a product image or enter product details, then run analysis to view results.
        </p>
        <div className="mt-6">
          <Link className="button-primary" to="/analysis">
            Start analysis
          </Link>
        </div>
      </div>
    )
  }

  const declaredValue = Number(analysis.declared_value || 0)
  const dutyPercent = Number(tariffSummary?.total_duty_percent || 0)
  const dutyAmount = Number(tariffSummary?.estimated_duty_amount || 0)
  const baseDuty = Number(tariffSummary?.base_duty || 0)
  const additionalDuty = Number(tariffSummary?.additional_duty || 0)
  const agreementDiscount = Number(tariffSummary?.trade_agreement_discount || 0)
  const backendRiskScore = Number(riskScore || 0)
  const landedCost = declaredValue + dutyAmount
  const materialCoverage = sortedMaterials.reduce((acc, material) => acc + Number(material.percentage || 0), 0)
  const dominantMaterial = sortedMaterials[0]
  const dutyComponentSum = baseDuty + additionalDuty + agreementDiscount
  const dutyDelta = dutyPercent - dutyComponentSum
  const compliancePriority = complianceItems.filter((check) => {
    const status = normalizeComplianceStatus(check.status)
    return status === 'warn' || status === 'action_required'
  })

  const handleSaveAnalysis = () => {
    if (!analysis?.analysis_id) {
      setActionError('Cannot save analysis without an analysis ID.')
      setActionMessage('')
      return
    }

    setIsSaving(true)
    setActionError('')
    setActionMessage('')

    try {
      upsertSavedAnalysis(currentSnapshot)
      setActionMessage('Analysis saved to your library.')
    } catch (error) {
      setActionError(error?.message || 'Failed to save analysis.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleExportReport = async () => {
    if (!analysis?.analysis_id) {
      setActionError('Cannot export report without an analysis ID.')
      setActionMessage('')
      return
    }

    setIsExporting(true)
    setActionError('')
    setActionMessage('')

    try {
      let reportPayload = report || null
      let usedFallback = false

      if (!reportPayload) {
        try {
          reportPayload = await fetchReport(analysis.analysis_id)
        } catch {
          usedFallback = true
        }
      }

      const reportText = buildReportText({
        ...currentSnapshot,
        report: reportPayload || currentSnapshot.report
      })
      const filename = buildReportFilename(analysis.analysis_id)
      downloadReportText(filename, reportText)

      setActionMessage(
        usedFallback
          ? 'Report exported using current analysis data (backend summary unavailable).'
          : 'Report exported.'
      )
    } catch (error) {
      setActionError(error?.message || 'Failed to export report.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-12">
      <section className="dashboard-hero">
        <div className="dashboard-frame">
          <div className="dashboard-map">
            <TradeRouteGlobe routeData={routeData} />
          </div>
          <div className="dashboard-cta-row">
            <button className="dashboard-chip" type="button" onClick={() => navigate('/analysis')}>
              Re-run analysis
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="stat-card">
          <LabelWithInfo
            label="HS Code"
            info="HS classification predicted by the backend model from product description/image and material composition."
          />
          <h3>{analysis.hs_code || 'N/A'}</h3>
          <span>{confidence}% confidence from model output.</span>
        </div>

        <div className="stat-card">
          <LabelWithInfo
            label="Declared Value"
            info="Input customs value entered for the shipment."
          />
          <h3>{formatCurrency(declaredValue)}</h3>
          <span>
            {countryNameByCode(analysis.manufacturing_country)} to {countryNameByCode(analysis.destination_country)}
          </span>
        </div>

        <div className="stat-card">
          <LabelWithInfo
            label="Total Duty Rate"
            info="Backend output: total_duty_percent after combining base duty, additional duty, and trade agreement adjustment."
          />
          <h3>{formatPercent(dutyPercent)}</h3>
          <span>Estimated duty amount: {formatCurrency(dutyAmount)}.</span>
        </div>

        <div className="stat-card">
          <LabelWithInfo
            label="Landed Cost"
            info="Calculated as declared value + estimated duty amount. Excludes freight, insurance, and local charges."
          />
          <h3>{formatCurrency(landedCost)}</h3>
          <span>{formatCurrency(declaredValue)} + {formatCurrency(dutyAmount)}</span>
        </div>

        <div className="stat-card">
          <LabelWithInfo
            label="Risk Score"
            info="Backend risk score (0-100) based on destination and trade context."
          />
          <h3>{backendRiskScore.toFixed(2)}</h3>
          <span>{riskLevel} risk band.</span>
        </div>

        <div className="stat-card">
          <LabelWithInfo
            label="Material Coverage"
            info="Sum of all material percentages in the bill of materials. Ideally close to 100%."
          />
          <h3>{formatPercent(materialCoverage)}</h3>
          <span>
            {dominantMaterial
              ? `Largest share: ${toTitleCase(dominantMaterial.name)} (${Number(dominantMaterial.percentage || 0).toFixed(2)}%).`
              : 'No material lines returned.'}
          </span>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="glass-panel p-6">
          <h3 className="section-title flex items-center gap-2">
            <span>Duty Calculation Breakdown</span>
            <InfoHint text="Shows each backend duty component and how close the component sum is to total duty percent." />
          </h3>
          <div className="stacked-bars mt-6">
            <div className="stacked-row">
              <span className="flex items-center gap-2">Base Duty <InfoHint text="Base tariff rate from HS classification and lane." /></span>
              <div className="stacked-track">
                <div className="stacked-fill" style={{ width: `${Math.min(Math.abs(baseDuty) * 2.5, 100)}%` }} />
              </div>
            </div>
            <div className="stacked-row">
              <span className="flex items-center gap-2">Additional Duty <InfoHint text="Supplemental duties/surcharges applied for the trade lane." /></span>
              <div className="stacked-track">
                <div className="stacked-fill warm" style={{ width: `${Math.min(Math.abs(additionalDuty) * 2.5, 100)}%` }} />
              </div>
            </div>
            <div className="stacked-row">
              <span className="flex items-center gap-2">Agreement Adjustment <InfoHint text="Trade agreement effect. Negative values lower duty; positive values increase duty." /></span>
              <div className="stacked-track">
                <div className="stacked-fill alt" style={{ width: `${Math.min(Math.abs(agreementDiscount) * 2.5, 100)}%` }} />
              </div>
            </div>
            <div className="stacked-row">
              <span className="flex items-center gap-2">Total Duty <InfoHint text="Final rate returned by backend and used for duty amount calculation." /></span>
              <div className="stacked-track">
                <div className="stacked-fill muted" style={{ width: `${Math.min(Math.abs(dutyPercent) * 2.5, 100)}%` }} />
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 rounded-2xl border border-white/10 p-4 text-sm text-[color:var(--text-muted)]">
            <p className="flex items-center gap-2">
              <span>Component sum (base + additional + adjustment): {formatPercent(dutyComponentSum)}</span>
              <InfoHint text="Computed in UI from backend components." />
            </p>
            <p className="flex items-center gap-2">
              <span>Backend total duty: {formatPercent(dutyPercent)}</span>
              <InfoHint text="Exact total_duty_percent returned by API." />
            </p>
            <p className="flex items-center gap-2">
              <span>Difference: {formatPercent(dutyDelta)}</span>
              <InfoHint text="Backend total minus component sum. Non-zero value indicates backend rounding or hidden factors." />
            </p>
          </div>

          <p className="mt-4 text-sm text-[color:var(--text-muted)]">
            {tariffSummary?.explanation || 'Tariff explanation is not available from backend for this run.'}
          </p>
        </div>

        <div className="glass-panel p-6">
          <h3 className="section-title flex items-center gap-2">
            <span>Material Duty Exposure</span>
            <InfoHint text="Estimated duty by material share: total duty amount x material percentage." />
          </h3>
          {sortedMaterials.length === 0 && (
            <p className="mt-6 text-sm text-[color:var(--text-muted)]">No materials found in this analysis.</p>
          )}
          {sortedMaterials.length > 0 && (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-[color:var(--text-muted)]">
                    <th className="py-2 pr-3 font-semibold">
                      <span className="flex items-center gap-2">Material <InfoHint text="Material name from backend parsing/classification." /></span>
                    </th>
                    <th className="py-2 pr-3 font-semibold">
                      <span className="flex items-center gap-2">Origin <InfoHint text="Country code assigned to each material line." /></span>
                    </th>
                    <th className="py-2 pr-3 font-semibold">
                      <span className="flex items-center gap-2">Share % <InfoHint text="Material percentage contribution to product composition." /></span>
                    </th>
                    <th className="py-2 pr-3 font-semibold">
                      <span className="flex items-center gap-2">Est. Duty Share <InfoHint text="Calculated as estimated duty amount x (share % / 100)." /></span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedMaterials.map((material, index) => {
                    const pct = Number(material.percentage || 0)
                    const estimatedShare = dutyAmount * (pct / 100)
                    return (
                      <tr className="border-b border-white/5" key={material.id || `${material.name}-${index}`}>
                        <td className="py-3 pr-3">{toTitleCase(material.name)}</td>
                        <td className="py-3 pr-3">{countryNameByCode(material.origin_country)}</td>
                        <td className="py-3 pr-3">{formatPercent(pct)}</td>
                        <td className="py-3 pr-3">{formatCurrency(estimatedShare)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="glass-panel p-6">
          <h3 className="section-title flex items-center gap-2">
            <span>Compliance Priorities</span>
            <InfoHint text="Shows backend compliance checks with priority on warning/action-required items." />
          </h3>
          <div className="mt-4 grid gap-3 rounded-2xl border border-white/10 p-4 text-sm text-[color:var(--text-muted)]">
            <p className="flex items-center gap-2">
              <span>Total checks: {complianceItems.length}</span>
              <InfoHint text="Count of compliance_checks returned by backend (or fallback checks if absent)." />
            </p>
            <p className="flex items-center gap-2">
              <span>Priority issues: {compliancePriority.length}</span>
              <InfoHint text="Checks where status is warn or action_required." />
            </p>
          </div>

          <div className="checklist mt-6">
            {(compliancePriority.length ? compliancePriority : complianceItems).map((check, idx) => {
              const status = normalizeComplianceStatus(check.status)
              const isWarn = status === 'warn' || status === 'action_required'
              return (
                <div className={`check-row ${isWarn ? 'warn' : ''}`} key={`${check.item}-${idx}`}>
                  <span className="check-dot" />
                  <div>
                    <p className="flex items-center gap-2">
                      <span>{check.item}</span>
                      <InfoHint text={`Status is '${status}'. This status comes directly from backend compliance checks.`} />
                    </p>
                    {check.note && <p className="list-sub">{check.note}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="glass-panel p-6">
          <h3 className="section-title flex items-center gap-2">
            <span>Classification Context</span>
            <InfoHint text="Model explanations and run metadata used for audit trail and report generation." />
          </h3>
          <div className="list-stack mt-6">
            <div>
              <p className="list-title flex items-center gap-2">
                AI explanation
                <InfoHint text="Narrative reason for selected HS classification from backend." />
              </p>
              <p className="list-sub">{analysis.explanation || 'Not provided by backend.'}</p>
            </div>
            <div>
              <p className="list-title flex items-center gap-2">
                Resolved description
                <InfoHint text="Final normalized description used for model classification." />
              </p>
              <p className="list-sub">
                {analysis.resolved_description || 'Generated from uploaded image if no text description was provided.'}
              </p>
            </div>
            <div>
              <p className="list-title flex items-center gap-2">
                Analysis ID
                <InfoHint text="Unique backend ID for this run. Used for save/export/report retrieval." />
              </p>
              <p className="list-sub">{analysis.analysis_id}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="dashboard-actions print-hidden">
        <button className="button-secondary" type="button" onClick={() => navigate('/analysis')}>
          Go back
        </button>
        <div className="action-group">
          <button className="button-secondary" type="button" onClick={() => navigate('/home')}>
            Main menu
          </button>
          <button
            className="button-secondary"
            type="button"
            onClick={handleExportReport}
            disabled={isExporting}
          >
            {isExporting ? 'Exporting...' : 'Export report'}
          </button>
          <button
            className="button-primary"
            type="button"
            onClick={handleSaveAnalysis}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save analysis'}
          </button>
        </div>
        {actionMessage && <p className="text-xs text-[color:var(--text-muted)]">{actionMessage}</p>}
        {actionError && <p className="text-xs text-ember">{actionError}</p>}
      </section>
    </div>
  )
}
