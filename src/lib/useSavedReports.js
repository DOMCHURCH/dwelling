import { useState, useCallback, useEffect, useRef } from 'react'
import { getAuthToken } from './localAuth'

export function useSavedReports(user) {
  const [saved, setSaved] = useState([])
  const [loading, setLoading] = useState(false)
  const fetchedRef = useRef(false)

  const fetchReports = useCallback(async () => {
    const token = await getAuthToken()
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'list-reports' }),
      })
      if (res.ok) {
        const { reports } = await res.json()
        setSaved(reports || [])
      }
    } catch { /* network error — fail silently */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (user && !fetchedRef.current) {
      fetchedRef.current = true
      fetchReports()
    }
    if (!user) {
      fetchedRef.current = false
      setSaved([])
    }
  }, [user, fetchReports])

  const saveReport = useCallback(async (data) => {
    const token = await getAuthToken()
    if (!token) return null
    const address = data.geo?.displayName || 'Unknown area'
    const city = data.geo?.displayName?.split(',')[0] || 'Unknown'
    const score = data.realData?.areaRiskScore?.score ?? null
    const verdict = data.ai?.areaIntelligence?.verdict ?? null
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'save-report', address, city, score, verdict, data }),
      })
      if (res.ok) {
        const { id } = await res.json()
        setSaved(prev => {
          const deduped = prev.filter(r => r.address !== address)
          return [{ id, address, city, score, verdict, created_at: new Date().toISOString() }, ...deduped]
        })
        return id
      }
    } catch { /* fail silently */ }
    return null
  }, [])

  const loadReport = useCallback(async (id) => {
    const token = await getAuthToken()
    if (!token) return null
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'get-report', id }),
      })
      if (res.ok) return await res.json()
    } catch { /* fail silently */ }
    return null
  }, [])

  const deleteReport = useCallback(async (id) => {
    const token = await getAuthToken()
    if (!token) return
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'delete-report', id }),
      })
      setSaved(prev => prev.filter(r => r.id !== id))
    } catch { /* fail silently */ }
  }, [])

  const isReportSaved = useCallback((data) => {
    const address = data?.geo?.displayName
    if (!address) return false
    return saved.some(r => r.address === address)
  }, [saved])

  return { saved, loading, saveReport, loadReport, deleteReport, isReportSaved, refetch: fetchReports }
}
