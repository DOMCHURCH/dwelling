import { useState } from 'react'

const PROVINCES = [
  { value: '', label: 'Province (optional)' },
  { value: 'Alberta', label: 'Alberta' },
  { value: 'British Columbia', label: 'British Columbia' },
  { value: 'Manitoba', label: 'Manitoba' },
  { value: 'New Brunswick', label: 'New Brunswick' },
  { value: 'Newfoundland and Labrador', label: 'Newfoundland and Labrador' },
  { value: 'Northwest Territories', label: 'Northwest Territories' },
  { value: 'Nova Scotia', label: 'Nova Scotia' },
  { value: 'Nunavut', label: 'Nunavut' },
  { value: 'Ontario', label: 'Ontario' },
  { value: 'Prince Edward Island', label: 'Prince Edward Island' },
  { value: 'Quebec', label: 'Quebec' },
  { value: 'Saskatchewan', label: 'Saskatchewan' },
  { value: 'Yukon', label: 'Yukon' },
]

const CITIES_BY_PROVINCE = {
  'Ontario': ['Toronto','Ottawa','Mississauga','Brampton','Hamilton','London','Markham','Vaughan','Kitchener','Windsor','Richmond Hill','Oakville','Burlington','Sudbury','Barrie','Oshawa','St. Catharines','Cambridge','Guelph','Kingston'],
  'British Columbia': ['Vancouver','Surrey','Burnaby','Richmond','Kelowna','Abbotsford','Coquitlam','Langley','Saanich','Delta','Nanaimo','Kamloops','Victoria','Chilliwack','Prince George'],
  'Alberta': ['Calgary','Edmonton','Red Deer','Lethbridge','St. Albert','Medicine Hat','Grande Prairie','Airdrie','Spruce Grove','Leduc'],
  'Quebec': ['Montreal','Quebec City','Laval','Gatineau','Longueuil','Sherbrooke','Saguenay','Levis','Trois-Rivieres','Terrebonne'],
  'Manitoba': ['Winnipeg','Brandon','Steinbach','Thompson','Portage la Prairie'],
  'Saskatchewan': ['Saskatoon','Regina','Prince Albert','Moose Jaw','Swift Current'],
  'Nova Scotia': ['Halifax','Cape Breton','Truro','New Glasgow'],
  'New Brunswick': ['Moncton','Saint John','Fredericton','Miramichi'],
  'Newfoundland and Labrador': ["St. John's",'Corner Brook','Gander'],
  'Prince Edward Island': ['Charlottetown','Summerside'],
  'Northwest Territories': ['Yellowknife'],
  'Nunavut': ['Iqaluit'],
  'Yukon': ['Whitehorse'],
}

function getAllCities() {
  const all = []
  for (const [province, cities] of Object.entries(CITIES_BY_PROVINCE)) {
    for (const city of cities) all.push({ city, province })
  }
  return all.sort((a, b) => a.city.localeCompare(b.city))
}

const inputStyle = {
  width: '100%', padding: '12px 16px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12, color: '#ffffff', fontSize: 14,
  outline: 'none', fontFamily: "'Barlow', sans-serif", fontWeight: 300,
  transition: 'border-color 0.15s, background 0.15s',
  cursor: 'pointer',
  appearance: 'none', WebkitAppearance: 'none',
}

const selectWrapper = { position: 'relative', width: '100%' }
const chevron = {
  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
  pointerEvents: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 12,
}

const btn = (valid, loading) => ({
  borderRadius: 40, border: 'none',
  cursor: valid && !loading ? 'pointer' : 'not-allowed',
  fontFamily: "'Barlow', sans-serif", fontWeight: 600,
  background: valid && !loading ? '#ffffff' : 'rgba(255,255,255,0.06)',
  color: valid && !loading ? '#000' : 'rgba(255,255,255,0.3)',
  transition: 'transform 0.15s, background 0.15s',
})

const hoverBtn = e => { e.currentTarget.style.transform = 'scale(1.02)' }
const unhoverBtn = e => { e.currentTarget.style.transform = '' }

export default function AddressSearch({ onSearch, loading, compact }) {
  const [selectedCity, setSelectedCity] = useState('')
  const [selectedProvince, setSelectedProvince] = useState('')
  const [query, setQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  const allCities = getAllCities()
  const filtered = query.length > 0
    ? allCities.filter(c =>
        c.city.toLowerCase().startsWith(query.toLowerCase()) ||
        (selectedProvince && c.province === selectedProvince && c.city.toLowerCase().includes(query.toLowerCase()))
      ).slice(0, 8)
    : (selectedProvince
        ? (CITIES_BY_PROVINCE[selectedProvince] || []).map(c => ({ city: c, province: selectedProvince })).slice(0, 8)
        : allCities.slice(0, 8))

  const handleCitySelect = (city, province) => {
    setSelectedCity(city)
    setSelectedProvince(province)
    setQuery(city)
    setShowDropdown(false)
  }

  const submit = (e) => {
    e?.preventDefault()
    const cityName = selectedCity || query.trim()
    if (!cityName) return
    onSearch({ street: '', city: cityName, state: selectedProvince, country: 'Canada', knownFacts: {} })
  }

  const valid = selectedCity || query.trim()

  const focusStyle = e => { e.target.style.borderColor = 'rgba(255,255,255,0.3)'; e.target.style.background = 'rgba(255,255,255,0.08)' }
  const blurStyle  = e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)';  e.target.style.background = 'rgba(255,255,255,0.05)' }

  const canadaFlag = (
    <span style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 20, padding: '3px 10px', fontSize: 11, color: 'rgba(255,100,100,0.8)', fontFamily: "'Barlow',sans-serif", fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      🍁 Canada only
    </span>
  )

  const cityInput = (
    <div style={{ position: 'relative' }}>
      {/* aria-label covers the missing visible label in compact mode */}
      <input
        id="dwelling-city-search"
        name="city"
        type="text"
        role="combobox"
        aria-label="Search Canadian city"
        aria-expanded={showDropdown}
        aria-autocomplete="list"
        aria-controls="city-listbox"
        value={query}
        onChange={e => { setQuery(e.target.value); setSelectedCity(''); setShowDropdown(true) }}
        onFocus={e => { focusStyle(e); setShowDropdown(true) }}
        onBlur={e => { blurStyle(e); setTimeout(() => setShowDropdown(false), 150) }}
        placeholder="Search city — e.g. Ottawa, Vancouver, Calgary"
        disabled={loading}
        autoComplete="off"
        style={{ ...inputStyle, cursor: 'text', paddingRight: 36 }}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault()
            if (filtered[0]) handleCitySelect(filtered[0].city, filtered[0].province)
            else submit()
          }
        }}
      />
      <span style={chevron} aria-hidden="true">▼</span>
      {showDropdown && filtered.length > 0 && (
        <ul
          id="city-listbox"
          role="listbox"
          aria-label="Canadian cities"
          style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
            background: 'rgba(15,15,20,0.98)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 12, marginTop: 4, overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            listStyle: 'none', padding: 0, margin: '4px 0 0 0',
          }}
        >
          {filtered.map(({ city, province }) => (
            <li
              key={`${city}-${province}`}
              role="option"
              aria-selected={selectedCity === city}
              onMouseDown={() => handleCitySelect(city, province)}
              style={{
                padding: '10px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                transition: 'background 0.1s',
                fontFamily: "'Barlow',sans-serif",
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ color: '#fff', fontSize: 13, fontWeight: 400 }}>{city}</span>
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 300 }}>{province}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )

  const provinceSelect = (
    <div style={selectWrapper}>
      <select
        id="dwelling-province-select"
        name="province"
        aria-label="Select province (optional)"
        value={selectedProvince}
        onChange={e => { setSelectedProvince(e.target.value); setSelectedCity(''); setQuery(''); setShowDropdown(true) }}
        disabled={loading}
        style={{ ...inputStyle }}
        onFocus={focusStyle}
        onBlur={blurStyle}
      >
        {PROVINCES.map(p => (
          <option key={p.value} value={p.value} style={{ background: '#111', color: '#fff' }}>{p.label}</option>
        ))}
      </select>
      <span style={chevron} aria-hidden="true">▼</span>
    </div>
  )

  if (compact) return (
    <form onSubmit={submit} role="search" aria-label="Search Canadian city">
      <div className="liquid-glass" style={{ borderRadius: 16, padding: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 2, minWidth: 160, position: 'relative' }}>
          {cityInput}
        </div>
        <div style={{ flex: 1, minWidth: 120 }}>
          {provinceSelect}
        </div>
        <button type="submit" disabled={loading || !valid}
          style={{ ...btn(valid, loading), padding: '10px 20px', fontSize: 13, whiteSpace: 'nowrap' }}
          aria-label={loading ? 'Analyzing...' : 'Search city'}
          onMouseEnter={hoverBtn} onMouseLeave={unhoverBtn}>
          {loading ? 'Analyzing...' : 'Search →'}
        </button>
      </div>
    </form>
  )

  return (
    <form onSubmit={submit} role="search" aria-label="Search Canadian city for analysis">
      <div className="liquid-glass-strong" style={{ borderRadius: 20, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <label
            htmlFor="dwelling-city-search"
            style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'Barlow',sans-serif" }}
          >
            City *
          </label>
          {canadaFlag}
        </div>
        <div style={{ marginBottom: 12 }}>
          {cityInput}
        </div>
        <div style={{ marginBottom: 16 }}>
          <label
            htmlFor="dwelling-province-select"
            style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6, fontFamily: "'Barlow',sans-serif" }}
          >
            Province <span style={{ opacity: 0.5 }}>(optional)</span>
          </label>
          {provinceSelect}
        </div>
        <button
          type="submit"
          disabled={loading || !valid}
          aria-label={loading ? 'Analyzing city data' : 'Get free city intelligence report'}
          style={{ ...btn(valid, loading), width: '100%', padding: '14px', fontSize: 15 }}
          onMouseEnter={hoverBtn} onMouseLeave={unhoverBtn}
        >
          {loading ? '⟳ Analyzing...' : '→ Get Free Report'}
        </button>
      </div>
    </form>
  )
}
