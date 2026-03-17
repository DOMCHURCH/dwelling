const BASE = 'https://countriesnow.space/api/v0.1'

export async function getCityCostOfLiving(city, country) {
  try {
    const res = await fetch(`${BASE}/countries/population/cities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city }),
    })
    const data = await res.json()
    return data.error ? null : data.data
  } catch {
    return null
  }
}

export async function getCountryInfo(country) {
  try {
    const res = await fetch(`${BASE}/countries/positions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country }),
    })
    const data = await res.json()
    return data.error ? null : data.data
  } catch {
    return null
  }
}

export async function getCitiesByCountry(country) {
  try {
    const res = await fetch(`${BASE}/countries/cities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country }),
    })
    const data = await res.json()
    return data.error ? [] : data.data
  } catch {
    return []
  }
}
