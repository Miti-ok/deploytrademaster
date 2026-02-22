export const isIso2 = (value, list) => {
  if (!value) return false
  const normalized = value.toUpperCase()
  return list.some((item) => item.code === normalized)
}

export const totalPercentage = (materials) => {
  return materials.reduce((sum, item) => sum + Number(item.percentage || 0), 0)
}

export const validateMaterials = (materials) => {
  const total = totalPercentage(materials)
  if (materials.length === 0) {
    return { valid: false, message: 'Add at least one material.' }
  }
  if (materials.some((m) => !m.name || !m.origin || !m.stage)) {
    return { valid: false, message: 'All material fields must be filled.' }
  }
  if (materials.some((m) => Number(m.percentage) <= 0)) {
    return { valid: false, message: 'Percentages must be positive.' }
  }
  if (Math.abs(total - 100) > 0.5) {
    return { valid: false, message: `Percentages must total 100 (currently ${total.toFixed(2)}).` }
  }
  return { valid: true, message: '' }
}

export const validateDeclaredValue = (value) => {
  return Number(value) > 0
}
