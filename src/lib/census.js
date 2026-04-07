// US Census ACS API — via server-side proxy (api/external.js)
// API key is kept server-side; client never sees it.

export async function getCensusData(street, city, state, country) {
  if (!country?.toLowerCase().includes('united states')) return null
  try {
    const res = await fetch('/api/external', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'census', street, city, state, country }),
    })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}
