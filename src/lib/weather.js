const BASE = 'https://api.open-meteo.com/v1'
const ARCHIVE = 'https://archive-api.open-meteo.com/v1'

export async function getCurrentWeather(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: 'temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,apparent_temperature',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum',
    forecast_days: 7,
    timezone: 'auto',
    temperature_unit: 'celsius',
    wind_speed_unit: 'kmh',
  })
  const res = await fetch(`${BASE}/forecast?${params}`, {
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`Weather fetch failed (${res.status})`)
  return res.json()
}

export async function getClimateNormals(lat, lon) {
  const end = new Date()
  const start = new Date()
  start.setFullYear(end.getFullYear() - 5)
  const fmt = d => d.toISOString().split('T')[0]

  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    start_date: fmt(start),
    end_date: fmt(end),
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max',
    timezone: 'auto',
    temperature_unit: 'celsius',
  })
  const res = await fetch(`${ARCHIVE}/archive?${params}`, {
    signal: AbortSignal.timeout(12000), // climate archive can be slower
  })
  if (!res.ok) return null // non-fatal — climate normals are supplementary
  const data = await res.json()

  if (!data.daily) return null

  const temps = data.daily.temperature_2m_max
  const tempsMins = data.daily.temperature_2m_min
  const precip = data.daily.precipitation_sum

  const avg = arr => arr.filter(v => v != null).reduce((a, b) => a + b, 0) / arr.filter(v => v != null).length

  return {
    avgHighC: avg(temps).toFixed(1),
    avgLowC: avg(tempsMins).toFixed(1),
    avgPrecipMm: avg(precip).toFixed(1),
    totalDays: temps.length,
  }
}

export function weatherCodeToDescription(code) {
  const map = {
    0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Foggy', 48: 'Icy fog', 51: 'Light drizzle', 53: 'Moderate drizzle',
    55: 'Dense drizzle', 61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
    71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow', 77: 'Snow grains',
    80: 'Slight showers', 81: 'Moderate showers', 82: 'Violent showers',
    85: 'Snow showers', 86: 'Heavy snow showers', 95: 'Thunderstorm',
    96: 'Thunderstorm + hail', 99: 'Thunderstorm + heavy hail',
  }
  return map[code] ?? 'Unknown'
}
