import { useState, useCallback } from 'react'

const KEY = 'dw_saved_reports'
const MAX = 10

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}

export function useSavedReports() {
  const [saved, setSaved] = useState(load)

  const saveReport = useCallback((data) => {
    const reports = load()
    const address = data.geo?.displayName || 'Unknown area'
    // Avoid exact duplicates
    const deduped = reports.filter(r => r.address !== address)
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      savedAt: new Date().toISOString(),
      address,
      city: data.geo?.displayName?.split(',')[0] || 'Unknown',
      score: data.realData?.areaRiskScore?.score ?? null,
      verdict: data.ai?.areaIntelligence?.verdict ?? null,
      data,
    }
    const updated = [entry, ...deduped].slice(0, MAX)
    localStorage.setItem(KEY, JSON.stringify(updated))
    setSaved(updated)
    return entry.id
  }, [])

  const deleteReport = useCallback((id) => {
    const updated = load().filter(r => r.id !== id)
    localStorage.setItem(KEY, JSON.stringify(updated))
    setSaved(updated)
  }, [])

  const isReportSaved = useCallback((data) => {
    const address = data?.geo?.displayName
    if (!address) return false
    return load().some(r => r.address === address)
  }, [])

  return { saved, saveReport, deleteReport, isReportSaved }
}
