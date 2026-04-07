// US Census ACS API — via server-side proxy (api/census.js)
// API key is kept server-side; client never sees it.

export async function getCensusData(street, city, state, country) {
  // Only works for US addresses
  if (!country || !country.toLowerCase().includes('united states')) return null
  try {
    const res = await fetch('/api/census', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ street, city, state }),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}
