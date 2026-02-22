const formatCurrency = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  }).format(Number(value || 0))

const formatPercent = (value) => `${Number(value || 0).toFixed(2)}%`

const toLines = (items, mapper) =>
  Array.isArray(items) && items.length ? items.map(mapper) : ['- None']

export const buildReportText = ({
  analysis,
  materials = [],
  tariffSummary,
  riskScore,
  report,
  recentInsights = [],
  shippingOptions = [],
  complianceChecks = []
}) => {
  const headerLines = [
    'TradeMaster Analysis Report',
    `Generated: ${new Date().toISOString()}`,
    '',
    'Analysis',
    `- Analysis ID: ${analysis?.analysis_id || 'N/A'}`,
    `- Product: ${analysis?.product_name || 'N/A'}`,
    `- HS Code: ${analysis?.hs_code || report?.hs_code || 'N/A'}`,
    `- Manufacturing Country: ${analysis?.manufacturing_country || 'N/A'}`,
    `- Destination Country: ${analysis?.destination_country || 'N/A'}`,
    `- Declared Value: ${formatCurrency(analysis?.declared_value || 0)}`,
    `- Risk Score: ${Number(riskScore || 0).toFixed(2)}`,
    '',
    'Tariff Summary',
    `- Total Duty: ${formatPercent(tariffSummary?.total_duty_percent)}`,
    `- Estimated Duty Amount: ${formatCurrency(tariffSummary?.estimated_duty_amount)}`,
    `- Base Duty: ${formatPercent(tariffSummary?.base_duty)}`,
    `- Additional Duty: ${formatPercent(tariffSummary?.additional_duty)}`,
    `- Trade Agreement Discount: ${formatPercent(tariffSummary?.trade_agreement_discount)}`,
    '',
    'Classification Notes',
    `- Explanation: ${analysis?.explanation || 'N/A'}`,
    `- Resolved Description: ${analysis?.resolved_description || 'N/A'}`,
    ''
  ]

  const materialLines = ['Materials', ...toLines(materials, (material) => {
    const pct = Number(material?.percentage || 0).toFixed(2)
    return `- ${material?.name || 'Unknown'} (${pct}%) | origin ${material?.origin_country || 'N/A'} | stage ${material?.stage || 'N/A'}`
  })]

  const insightLines = ['', 'Recent Insights', ...toLines(recentInsights, (item) => {
    const title = item?.title || 'Insight'
    const detail = item?.detail || item?.summary || ''
    return `- ${title}: ${detail}`
  })]

  const shippingLines = ['', 'Shipping Options', ...toLines(shippingOptions, (option) => {
    const mode = String(option?.mode || 'MODE').toUpperCase()
    const eta = Number(option?.eta_days || 0)
    return `- ${mode} | ${option?.route || 'N/A'} | ETA ${eta} days | Cost ${formatCurrency(option?.estimated_cost_usd || 0)} | Risk ${option?.risk_level || 'N/A'}`
  })]

  const complianceLines = ['', 'Compliance Checks', ...toLines(complianceChecks, (check) => {
    const status = String(check?.status || 'warn').toUpperCase()
    return `- ${check?.item || 'Check'} [${status}] ${check?.note || ''}`.trim()
  })]

  const backendSummary = [
    '',
    'Backend Report Summary',
    `- ${report?.summary || 'No backend summary available.'}`
  ]

  return [
    ...headerLines,
    ...materialLines,
    ...insightLines,
    ...shippingLines,
    ...complianceLines,
    ...backendSummary
  ].join('\n')
}

export const buildReportFilename = (analysisId) => {
  const safeId = String(analysisId || 'analysis').replace(/[^a-zA-Z0-9_-]/g, '')
  return `trade-report-${safeId || 'analysis'}.txt`
}

export const downloadReportText = (filename, content) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return
  }

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}
