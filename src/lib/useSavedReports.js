import { useState, useEffect, useCallback, useRef } from 'react'
import { getAuthToken } from './localAuth'

export function useSavedReports(isPro) {
  const [savedReports, setSavedReports] = useState([])
  const [loading, setLoading] = useState(false)
  const fetchedRef = useRef(false)

  const fetchSaved = useCallback(async () => {
    if (!isPro) return
    const token = await getAuthToken()
    if (!token) return
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'list-reports' }),
      })
      if (res.ok) {
        const { reports } = await res.json()
        setSavedReports(reports ?? [])
      }
    } catch (e) {
      console.error('Failed to fetch saved reports', e)
    }
  }, [isPro])

  useEffect(() => {
    if (isPro && !fetchedRef.current) {
      fetchedRef.current = true
      fetchSaved()
    }
    if (!isPro) {
      fetchedRef.current = false
      setSavedReports([])
    }
  }, [isPro, fetchSaved])

  const saveReport = useCallback(async (data) => {
    const token = await getAuthToken()
    if (!token) return { error: 'Not authenticated' }
    setLoading(true)
    const address = data?.geo?.displayName || 'Unknown area'
    const city = data?.geo?.displayName?.split(',')[0] || 'Unknown'
    const score = data?.realData?.areaRiskScore?.score ?? null
    const verdict = data?.ai?.areaIntelligence?.verdict ?? null
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'save-report', address, city, score, verdict, data }),
      })
      const json = await res.json()
      if (res.ok && json.id) {
        setSavedReports(prev => {
          const deduped = prev.filter(r => r.address !== address)
          return [{ id: json.id, address, city, score, verdict, created_at: new Date().toISOString() }, ...deduped]
        })
        return { success: true, id: json.id }
      }
      return { error: json.error || 'Failed to save' }
    } catch (e) {
      return { error: 'Failed to save report' }
    } finally {
      setLoading(false)
    }
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
      if (res.ok) {
        const row = await res.json()
        return typeof row.data === 'string' ? JSON.parse(row.data) : row.data
      }
    } catch (e) {
      console.error('Failed to load report', e)
    }
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
      setSavedReports(prev => prev.filter(r => r.id !== id))
    } catch (e) {
      console.error('Failed to delete report', e)
    }
  }, [])

  const isReportSaved = useCallback((data) => {
    const address = data?.geo?.displayName
    if (!address) return false
    return savedReports.some(r => r.address === address)
  }, [savedReports])

  return { savedReports, loading, saveReport, loadReport, deleteReport, isReportSaved, refetch: fetchSaved }
}
