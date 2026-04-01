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
  'Ontario': [
    'Ajax','Alexandria','Arnprior','Aurora','Bancroft','Barrie','Belleville',
    'Blind River','Bradford West Gwillimbury','Brampton','Brantford','Brockville',
    'Cambridge','Carleton Place','Carleton Place','Casselman','Chatham',
    'Clarence-Rockland','Clarington','Cobourg','Collingwood','Cornwall',
    'Dryden','East Gwillimbury','Elliot Lake','Fenelon Falls','Fort Frances',
    'Georgina','Gloucester','Gravenhurst','Guelph','Halton Hills','Hamilton',
    'Haliburton','Haldimand County','Hawkesbury','Huntsville','Innisfil',
    'Kanata','Kawartha Lakes','Kenora','Kingston','Kitchener','Leamington',
    'Lindsay','London','Markham','Midland','Milton','Mississauga',
    'Moose Factory','Moosonee','Napanee','Nepean','Newmarket','Niagara Falls',
    'Norfolk County','North Bay','Oakville','Orangeville','Orleans','Orillia',
    'Oshawa','Ottawa','Owen Sound','Parry Sound','Pembroke','Perth',
    'Peterborough','Pickering','Port Hope','Port Perry','Prescott',
    'Prince Edward County','Quinte West','Renfrew','Richmond Hill','Rockland',
    'Sarnia','Sault Ste. Marie','Simcoe','Sioux Lookout','Smiths Falls',
    'St. Catharines','St. Thomas','Stouffville','Stratford','Sudbury',
    'Thunder Bay','Tillsonburg','Timmins','Toronto','Trenton','Uxbridge',
    'Vaughan','Waterloo','Welland','Whitby','Windsor','Woodstock',
  ],
  'British Columbia': [
    '100 Mile House','Abbotsford','Agassiz','Anmore','Armstrong','Ashcroft',
    'Belcarra','Bowen Island','Burns Lake','Cache Creek','Campbell River',
    'Castlegar','Central Saanich','Chilliwack','Coldstream','Colwood',
    'Comox','Coquitlam','Courtenay','Cranbrook','Cumberland','Dawson Creek',
    'Delta','Duncan','Elkford','Enderby','Esquimalt','Fernie','Fort Nelson',
    'Fort St. John','Golden','Grand Forks','Greenwood','Harrison Hot Springs',
    'Highlands','Hope','Houston','Invermere','Kamloops','Kelowna','Kimberley',
    'Kitimat','Lake Country','Langford','Langley','Lillooet','Lions Bay',
    'Maple Ridge','McBride','Merritt','Metchosin','Mission','Nanaimo',
    'Nelson','New Westminster','North Saanich','North Vancouver','Oak Bay',
    'Oliver','Osoyoos','Parksville','Peace River','Peachland','Pemberton',
    'Penticton','Pitt Meadows','Port Alberni','Port Coquitlam','Port Moody',
    'Powell River','Prince George','Prince Rupert','Qualicum Beach','Quesnel',
    'Revelstoke','Richmond','Rossland','Salmon Arm','Sidney','Smithers',
    'Sooke','Sparwood','Spallumcheen','Squamish','Summerland','Surrey',
    'Terrace','Trail','Valemount','Vancouver','Vanderhoof','Vernon','Victoria',
    'View Royal','West Kelowna','West Vancouver','Whistler','White Rock',
    'Williams Lake',
  ],
  'Alberta': [
    'Airdrie','Athabasca','Banff','Barrhead','Bassano','Beaumont','Beiseker',
    'Bonnyville','Brooks','Calgary','Camrose','Canmore','Cardston','Carstairs',
    'Chestermere','Claresholm','Coaldale','Cochrane','Cold Lake','Crossfield',
    'Crowsnest Pass','Didsbury','Drumheller','Edson','Edmonton','Fairview',
    'Fort Macleod','Fort McMurray','Fort Saskatchewan','Fort Vermilion',
    'Gibbons','Grande Prairie','Grimshaw','High Level','High Prairie','High River',
    'Hinton','Innisfail','Jasper','Killam','Kindersley','Lac La Biche',
    'Lacombe','Lamont','Leduc','Lethbridge','Lloydminster','Manning',
    'Medicine Hat','Morinville','Nanton','Okotoks','Olds','Peace River',
    'Pincher Creek','Ponoka','Red Deer','Redwater','Rocky Mountain House',
    'Slave Lake','Spruce Grove','St. Albert','St. Paul','Stavely','Stettler',
    'Stony Plain','Strathmore','Sundre','Swan Hills','Taber','Three Hills',
    'Tofield','Vegreville','Vermilion','Viking','Wainwright','Westlock',
    'Wetaskiwin','Whitecourt','Lacombe','Bonnyville','Lloydminster',
  ],
  'Quebec': [
    'Alma','Amos','Amqui','Asbestos','Baie-Comeau','Beaconsfield','Beauce',
    'Beauceville','Berthierville','Blainville','Boisbriand','Bonaventure',
    'Boucherville','Brossard','Candiac','Cap-Pelé','Carleton-sur-Mer',
    'Chandler','Châteauguay','Chicoutimi','Côte-Saint-Luc','Cowansville',
    'Deux-Montagnes','Dolbeau-Mistassini','Dollard-des-Ormeaux','Drummondville',
    'Gaspé','Gatineau','Granby','Grand-Mère','Huntingdon','Joliette',
    'Jonquière','Kirkland','La Baie','La Pocatière','La Sarre','La Tuque',
    'Laval','Lebel-sur-Quévillon','Lévis','Longueuil','Magog','Mascouche',
    'Matane','Matagami','Mirabel','Mont-Joli','Mont-Royal','Mont-Saint-Hilaire',
    'Montmagny','Montréal','Nicolet','New Carlisle','New Richmond','Nipawin',
    'Plessisville','Pointe-Claire','Québec City','Repentigny','Rimouski',
    'Rivière-du-Loup','Roberval','Rouyn-Noranda','Sainte-Anne-des-Monts',
    'Sainte-Julie','Sainte-Marie','Sainte-Thérèse','Saint-Charles-Borromée',
    'Saint-Eustache','Saint-Félicien','Saint-Georges','Saint-Hyacinthe',
    'Saint-Jean-sur-Richelieu','Saint-Jérôme','Saint-Joseph-de-Beauce',
    'Saint-Lambert','Salaberry-de-Valleyfield','Senneterre','Sept-Îles',
    'Shawinigan','Sherbrooke','Sorel-Tracy','Terrebonne','Thetford Mines',
    'Trois-Rivières','Val-d'Or','Varennes','Vaudreuil-Dorion','Victoriaville',
    'Westmount',
  ],
  'Manitoba': [
    'Altona','Arborg','Ashern','Beausejour','Boissevain','Brandon','Carberry',
    'Carman','Dauphin','Deloraine','Eriksdale','Flin Flon','Gimli','Gladstone',
    'Headingley','Ile des Chênes','Killarney','La Broquerie','Lac du Bonnet',
    'MacGregor','Melita','Minnedosa','Morden','Neepawa','Niverville','Oakbank',
    'Pine Falls','Portage la Prairie','Powerview','Sainte-Anne','Selkirk',
    'Souris','Springfield','St. Boniface','Steinbach','Stonewall','Swan River',
    'Teulon','The Pas','Thompson','Virden','Waskada','West St. Paul','Winkler',
    'Winnipeg',
  ],
  'Saskatchewan': [
    'Arcola','Assiniboia','Balgonie','Bienfait','Broadview','Big River',
    'Candle Lake','Canora','Carnduff','Carlyle','Carrot River','Christopher Lake',
    'Coronach','Creighton','Debden','Emerald Park','Esterhazy','Estevan',
    'Fleming','Flin Flon','Fort Qu'Appelle','Gravelbourg','Grenfell','Hudson Bay',
    'Humboldt','Indian Head','Kamsack','Kerrobert','Kindersley','La Ronge',
    'Lampman','Lanigan','Leader','Lumsden','Maple Creek','Martensville',
    'McAdam','Meadow Lake','Melfort','Melville','Moose Jaw','Moosomin',
    'Nipawin','North Battleford','Outlook','Oxbow','Pilot Butte','Plaster Rock',
    'Preeceville','Prince Albert','Qu'Appelle','Redvers','Regina','Rocanville',
    'Saskatoon','Shaunavon','Shellbrook','Spy Hill','Spiritwood','Swift Current',
    'Tisdale','Tregarva','Virden','Wadena','Waskesiu Lake','Warman','Watson Lake',
    'Weyburn','White City','Whitewood','Wolseley','Wynyard','Yorkton',
  ],
  'Nova Scotia': [
    'Amherst','Antigonish','Baddeck','Berwick','Bridgewater','Cape Breton',
    'Canso','Cheticamp','Chester','Dartmouth','Digby','Enfield','Fall River',
    'Glace Bay','Guysborough','Halifax','Hantsport','Inverness','Kentville',
    'Louisbourg','Liverpool','Lunenburg','Mahone Bay','Middleton','Mulgrave',
    'New Glasgow','New Waterford','North Sydney','Port Hawkesbury','Reserve Mines',
    'Shelburne','Sheet Harbour','Sydney','Sydney Mines','Truro','Windsor',
    'Wolfville','Yarmouth',
  ],
  'New Brunswick': [
    'Aroostook','Bathurst','Beaubassin East','Belledune','Bouctouche',
    'Campbellton','Cap-Pelé','Caraquet','Charlo','Dalhousie','Dieppe',
    'Dorchester','Edmundston','Florenceville','Fredericton','Grand Bay-Westfield',
    'Grand Falls','Hampton','Harvey','Hartland','Lamèque','McAdam','Memramcook',
    'Miramichi','Milltown','Moncton','Nackawic','Oromocto','Perth-Andover',
    'Petit-Rocher','Plaster Rock','Quispamsis','Rexton','Richibucto',
    'Riverview','Rothesay','Sackville','Saint John','Shediac','Shippagan',
    'St. Andrews','St. Stephen','Sussex','Tobique','Tracadie','Woodstock',
  ],
  'Newfoundland and Labrador': [
    'Argentia','Baie Verte','Bishop's Falls','Botwood','Burin','Carbonear',
    'CBS','Channel-Port aux Basques','Clarenville','Conception Bay South',
    'Corner Brook','Deer Lake','Ferryland','Fortune','Gambo','Gander',
    'Glovertown','Grand Bank','Grand Falls-Windsor','Happy Valley-Goose Bay',
    'Labrador City','Lewisporte','Marystown','Mount Pearl','Paradise',
    'Placentia','Port aux Basques','Port aux Choix','Portugal Cove-St. Phillips',
    'Springdale','St. Anthony','St. Lawrence',"St. John's",'Stephenville',
    'Torbay','Trepassey','Twillingate','Windsor','Witless Bay',
  ],
  'Prince Edward Island': [
    'Alberton','Charlottetown','Cornwall','Kensington','Montague','O'Leary',
    'Souris','Stratford','Summerside','Tignish',
  ],
  'Northwest Territories': ['Behchoko','Fort Smith','Hay River','Inuvik','Yellowknife'],
  'Nunavut': ['Arviat','Baker Lake','Cambridge Bay','Iqaluit','Rankin Inlet'],
  'Yukon': ['Carmacks','Dawson City','Haines Junction','Ross River','Watson Lake','Whitehorse'],
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
