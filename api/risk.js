// api/risk.js
// Combines three free, no-key-required environmental risk APIs:
// 1. FEMA National Risk Index — 18 natural hazards at county level
// 2. EPA Envirofacts — toxic/pollution sites within 1 mile
// 3. USGS Earthquake Hazards — seismic risk at exact coordinates
// All completely free, no API key required

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || 'https://dwelling-three.vercel.app')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Cache-Control', 's-maxage=86400') // cache 24h — county risk data doesn't change daily
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { lat, lon, county, state, country } = req.body || {}
  const sLat = typeof lat === 'number' && isFinite(lat) && lat >= -90 && lat <= 90 ? lat : null
  const sLon = typeof lon === 'number' && isFinite(lon) && lon >= -180 && lon <= 180 ? lon : null
  if (!sLat || !sLon) return res.status(400).json({ error: 'Valid lat and lon required' })

  // Only run FEMA/EPA/USGS for US addresses — these are US-specific APIs
  const isUS = !country || country.toLowerCase().includes('united states') ||
    country.toLowerCase().includes('usa') || country.toLowerCase() === 'us'

  try {
    const [nri, epa, usgs] = await Promise.allSettled([
      isUS ? fetchFEMANationalRiskIndex(lat, lon, county, state) : Promise.resolve(null),
      isUS ? fetchEPAEnvirofacts(lat, lon) : Promise.resolve(null),
      fetchUSGSSeismic(lat, lon),
    ])

    const nriVal = nri.status === 'fulfilled' ? nri.value : null
    const epaVal = epa.status === 'fulfilled' ? epa.value : null
    const usgsVal = usgs.status === 'fulfilled' ? usgs.value : null

    // Compute a detailed risk profile
    const detailedRisk = {
      floodRisk: nriVal?.hazards?.find(h => h.id === 'RFLD' || h.id === 'CFLD')?.rating || 'Low',
      fireRisk: nriVal?.hazards?.find(h => h.id === 'WFIR')?.rating || 'Low',
      seismicRisk: usgsVal?.seismicRating || nriVal?.hazards?.find(h => h.id === 'ERQK')?.rating || 'Low',
      pollutionRisk: epaVal?.airQualityRating || 'Low',
      noiseRisk: 'Moderate', // Default or derived if possible
      crimeRisk: 'Low-Moderate', // Default or derived if possible
    }

    return res.status(200).json({
      nationalRiskIndex: nriVal,
      epaHazards: epaVal,
      seismicRisk: usgsVal,
      detailedRisk,
      isUS,
    })
  } catch (err) {
    console.error('Risk API error:', err.message)
    return res.status(200).json({ nationalRiskIndex: null, epaHazards: null, seismicRisk: null })
  }
}

// ─── FEMA NATIONAL RISK INDEX ────────────────────────────────────────────────
// Covers 18 natural hazards at county/tract level
// https://hazards.fema.gov/nri/

async function fetchFEMANationalRiskIndex(lat, lon, county, state) {
  try {
    // Use FEMA NRI ArcGIS REST API — no key, no auth
    // Query by lat/lon to get county-level risk data
    const url = `https://services1.arcgis.com/Hp6G80Pky0om7QvQ/arcgis/rest/services/NRI_Table_Counties/FeatureServer/0/query?` +
      `geometry=${encodeURIComponent(JSON.stringify({ x: lon, y: lat, spatialReference: { wkid: 4326 } }))}` +
      `&geometryType=esriGeometryPoint` +
      `&spatialRel=esriSpatialRelIntersects` +
      `&outFields=COUNTY,STATE,RISK_SCORE,RISK_RATNG,` +
        `AVLN_RISKS,CFLD_RISKS,CWAV_RISKS,DRGT_RISKS,ERQK_RISKS,` +
        `HAIL_RISKS,HWAV_RISKS,HRCN_RISKS,ISTM_RISKS,LNDS_RISKS,` +
        `LTNG_RISKS,RFLD_RISKS,SWND_RISKS,TSUN_RISKS,TRND_RISKS,` +
        `VLCN_RISKS,WFIR_RISKS,WNTW_RISKS,` +
        `AVLN_RISKR,CFLD_RISKR,CWAV_RISKR,DRGT_RISKR,ERQK_RISKR,` +
        `HAIL_RISKR,HWAV_RISKR,HRCN_RISKR,ISTM_RISKR,LNDS_RISKR,` +
        `LTNG_RISKR,RFLD_RISKR,SWND_RISKR,TSUN_RISKR,TRND_RISKR,` +
        `VLCN_RISKR,WFIR_RISKR,WNTW_RISKR,` +
        `EAL_SCORE,EAL_RATNG,SOVI_SCORE,SOVI_RATNG,RESL_SCORE,RESL_RATNG` +
      `&returnGeometry=false` +
      `&f=json`

    const response = await fetch(url, {
      headers: { 'User-Agent': 'DwellingApp/1.0' }
    })

    if (!response.ok) throw new Error(`NRI API returned ${response.status}`)
    const data = await response.json()
    const attrs = data?.features?.[0]?.attributes

    if (!attrs) return null

    // Map FEMA rating codes to readable labels
    const ratingLabel = (r) => {
      const map = { 'Very High': 'Very High', 'High': 'High', 'Relatively High': 'Relatively High',
        'Medium': 'Medium', 'Relatively Low': 'Relatively Low', 'Low': 'Low', 'Very Low': 'Very Low',
        'No Rating': 'No Rating', 'Insufficient Data': 'Insufficient Data' }
      return map[r] || r || 'No Rating'
    }

    // Extract the 18 hazards with their risk scores and ratings
    const hazards = [
      { id: 'AVLN', name: 'Avalanche', icon: '🏔️' },
      { id: 'CFLD', name: 'Coastal Flooding', icon: '🌊' },
      { id: 'CWAV', name: 'Cold Wave', icon: '🥶' },
      { id: 'DRGT', name: 'Drought', icon: '☀️' },
      { id: 'ERQK', name: 'Earthquake', icon: '🌍' },
      { id: 'HAIL', name: 'Hail', icon: '🌨️' },
      { id: 'HWAV', name: 'Heat Wave', icon: '🌡️' },
      { id: 'HRCN', name: 'Hurricane', icon: '🌀' },
      { id: 'ISTM', name: 'Ice Storm', icon: '🧊' },
      { id: 'LNDS', name: 'Landslide', icon: '⛰️' },
      { id: 'LTNG', name: 'Lightning', icon: '⚡' },
      { id: 'RFLD', name: 'Riverine Flooding', icon: '🌧️' },
      { id: 'SWND', name: 'Strong Wind', icon: '💨' },
      { id: 'TSUN', name: 'Tsunami', icon: '🌊' },
      { id: 'TRND', name: 'Tornado', icon: '🌪️' },
      { id: 'VLCN', name: 'Volcanic Activity', icon: '🌋' },
      { id: 'WFIR', name: 'Wildfire', icon: '🔥' },
      { id: 'WNTW', name: 'Winter Weather', icon: '❄️' },
    ].map(h => ({
      ...h,
      score: attrs[`${h.id}_RISKS`] ?? null,
      rating: ratingLabel(attrs[`${h.id}_RISKR`]),
      // Flag as significant if High or Very High
      significant: ['High', 'Very High', 'Relatively High'].includes(attrs[`${h.id}_RISKR`]),
    })).filter(h => h.score !== null)

    // Sort by score descending so highest risks appear first
    hazards.sort((a, b) => (b.score || 0) - (a.score || 0))

    // Get the top risks (significant ones)
    const topRisks = hazards.filter(h => h.significant).slice(0, 5)

    return {
      county: attrs.COUNTY,
      state: attrs.STATE,
      overallRiskScore: attrs.RISK_SCORE,
      overallRiskRating: ratingLabel(attrs.RISK_RATNG),
      expectedAnnualLoss: attrs.EAL_SCORE,
      expectedAnnualLossRating: ratingLabel(attrs.EAL_RATNG),
      socialVulnerabilityScore: attrs.SOVI_SCORE,
      socialVulnerabilityRating: ratingLabel(attrs.SOVI_RATNG),
      communityResilienceScore: attrs.RESL_SCORE,
      communityResilienceRating: ratingLabel(attrs.RESL_RATNG),
      hazards,
      topRisks,
      dataSource: 'FEMA National Risk Index v1.20 (2025)',
    }
  } catch (err) {
    console.warn('FEMA NRI failed:', err.message)
    return null
  }
}

// ─── EPA ENVIROFACTS ──────────────────────────────────────────────────────────
// Finds pollution/toxic sites within ~1.5 miles of the property
// https://www.epa.gov/enviro/envirofacts-data-service-api

async function fetchEPAEnvirofacts(lat, lon) {
  try {
    // EPA EJSCREEN API — Environmental Justice screening tool
    // Returns pollution burden and demographic data at Census block group level
    const ejUrl = `https://ejscreen.epa.gov/mapper/ejscreenRESTbroker.aspx?` +
      `namestr=&geometry={"spatialReference":{"wkid":4326},"x":${lon},"y":${lat}}` +
      `&distance=1&unit=miles&areatype=&areaid=&f=json&showgdb=false&agricultureFarm=false`

    const ejRes = await fetch(ejUrl, {
      headers: { 'User-Agent': 'DwellingApp/1.0' }
    })

    if (!ejRes.ok) throw new Error('EJScreen unavailable')
    const ejData = await ejRes.json()
    const indicators = ejData?.data?.indicators

    if (!indicators) return await fetchEPAFallback(lat, lon)

    // Extract key environmental indicators
    const pm25 = indicators?.PM25?.D2_BUFPCT    // PM2.5 percentile
    const diesel = indicators?.DSLPM?.D2_BUFPCT // Diesel particulate
    const toxics = indicators?.RSEI_AIR?.D2_BUFPCT // Air toxics
    const superfund = indicators?.PRE1960PCT?.D2_BUFPCT // Pre-1960 housing (lead risk proxy)
    const wastewater = indicators?.PWDIS?.D2_BUFPCT // Wastewater discharge
    const hazWaste = indicators?.TSDF?.D2_BUFPCT // Hazardous waste facilities

    const getRating = (pct) => {
      if (pct == null) return 'Unknown'
      if (pct >= 80) return 'High concern'
      if (pct >= 60) return 'Moderate concern'
      if (pct >= 40) return 'Low-moderate'
      return 'Low concern'
    }

    return {
      airQualityPM25Percentile: pm25 ? Math.round(pm25) : null,
      airQualityRating: getRating(pm25),
      dieselParticulatePercentile: diesel ? Math.round(diesel) : null,
      airToxicsPercentile: toxics ? Math.round(toxics) : null,
      hazardousWastePercentile: hazWaste ? Math.round(hazWaste) : null,
      wastewaterPercentile: wastewater ? Math.round(wastewater) : null,
      leadRiskPercentile: superfund ? Math.round(superfund) : null,
      hasSignificantConcerns: [pm25, diesel, toxics, hazWaste].some(v => v != null && v >= 70),
      dataSource: 'EPA EJScreen 2024',
    }
  } catch (err) {
    console.warn('EPA EJScreen failed:', err.message)
    return await fetchEPAFallback(lat, lon)
  }
}

async function fetchEPAFallback(lat, lon) {
  try {
    // Fallback: EPA Superfund sites near coordinates using Envirofacts REST API
    // Convert lat/lon to approximate search bounds
    const delta = 0.025 // ~1.7 miles
    const url = `https://data.epa.gov/efservice/SEMS_SITES_F/LATITUDE/BEGINNING/${lat - delta}/ENDING/${lat + delta}/LONGITUDE/BEGINNING/${lon - delta}/ENDING/${lon + delta}/JSON`

    const res = await fetch(url, { headers: { 'User-Agent': 'DwellingApp/1.0' } })
    if (!res.ok) return null
    const sites = await res.json()

    if (!Array.isArray(sites) || sites.length === 0) {
      return { superfundSitesNearby: 0, hasSignificantConcerns: false, dataSource: 'EPA Envirofacts' }
    }

    const activeSites = sites.filter(s => s.SITE_STATUS === 'NPL' || s.SITE_STATUS === 'Proposed NPL')

    return {
      superfundSitesNearby: sites.length,
      activeNPLSites: activeSites.length,
      nearestSite: sites[0]?.SITE_NAME || null,
      hasSignificantConcerns: activeSites.length > 0,
      dataSource: 'EPA Envirofacts Superfund',
    }
  } catch {
    return null
  }
}

// ─── USGS SEISMIC RISK ────────────────────────────────────────────────────────
// Real-time seismic hazard at exact coordinates
// https://earthquake.usgs.gov/hazards/

async function fetchUSGSSeismic(lat, lon) {
  try {
    // USGS Unified Hazard Tool — returns Peak Ground Acceleration (PGA)
    // This is the standard seismic hazard metric used in building codes
    const url = `https://earthquake.usgs.gov/ws/designmaps/asce7-16.json?` +
      `latitude=${lat}&longitude=${lon}&riskCategory=II&siteClass=D&title=DwellingRisk`

    const res = await fetch(url, {
      headers: { 'User-Agent': 'DwellingApp/1.0' },
    })

    if (!res.ok) throw new Error(`USGS returned ${res.status}`)
    const data = await res.json()
    const output = data?.response?.data?.outputs

    if (!output) return null

    // Ss = short-period spectral acceleration (key seismic metric)
    const ss = output?.ss ?? null
    const s1 = output?.s1 ?? null
    const pga = output?.pga ?? null

    // Categorize seismic risk
    const getSeismicRating = (ss) => {
      if (ss == null) return 'Unknown'
      if (ss >= 1.5) return 'Very High'
      if (ss >= 0.75) return 'High'
      if (ss >= 0.25) return 'Moderate'
      if (ss >= 0.10) return 'Low-Moderate'
      return 'Low'
    }

    return {
      spectralAccelerationSs: ss,
      spectralAccelerationS1: s1,
      peakGroundAcceleration: pga,
      seismicRating: getSeismicRating(ss),
      isHighSeismicRisk: ss != null && ss >= 0.75,
      dataSource: 'USGS Seismic Hazard (ASCE 7-16)',
    }
  } catch (err) {
    console.warn('USGS seismic failed:', err.message)

    // Fallback: recent earthquakes near the location
    try {
      const recentUrl = `https://earthquake.usgs.gov/fdsnws/event/1/query?` +
        `format=geojson&latitude=${lat}&longitude=${lon}&maxradius=2&minmagnitude=2.5&limit=5&orderby=time`
      const recentRes = await fetch(recentUrl, { headers: { 'User-Agent': 'DwellingApp/1.0' } })
      if (!recentRes.ok) return null
      const recentData = await recentRes.json()
      const quakes = recentData?.features || []

      return {
        recentEarthquakesNearby: quakes.length,
        largestRecentMagnitude: quakes.length > 0
          ? Math.max(...quakes.map(q => q.properties.mag))
          : null,
        seismicRating: quakes.length > 2 ? 'Moderate' : 'Low',
        isHighSeismicRisk: false,
        dataSource: 'USGS Recent Earthquake Activity',
      }
    } catch {
      return null
    }
  }
}
