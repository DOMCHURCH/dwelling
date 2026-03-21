// src/lib/marketPrices.js
// Median home prices for major US and Canadian cities
// Sources: NAR Q1 2025, Redfin 2025/2026, CREA/WOWA March 2026, Teranet-National Bank HPI
// Last updated: March 2026
// All prices in local currency (USD for US, CAD for Canada)
// Update manually every 3-4 months by checking Redfin/CREA data

// ─── CANADA (CAD) ────────────────────────────────────────────────────────────

const CANADA = {
  // British Columbia
  vancouver:        { detached: 1930000, condo: 813000,  rent: 2900, ppsf: 1100, yoy: -0.7,  currency: 'CAD' },
  surrey:           { detached: 1450000, condo: 620000,  rent: 2400, ppsf: 750,  yoy: -1.0,  currency: 'CAD' },
  burnaby:          { detached: 1750000, condo: 780000,  rent: 2700, ppsf: 950,  yoy: -0.8,  currency: 'CAD' },
  richmond:         { detached: 1650000, condo: 720000,  rent: 2600, ppsf: 900,  yoy: -0.5,  currency: 'CAD' },
  kelowna:          { detached: 890000,  condo: 480000,  rent: 2000, ppsf: 520,  yoy: -2.0,  currency: 'CAD' },
  victoria:         { detached: 1050000, condo: 580000,  rent: 2200, ppsf: 650,  yoy: -0.6,  currency: 'CAD' },
  abbotsford:       { detached: 1050000, condo: 520000,  rent: 2100, ppsf: 580,  yoy: -1.5,  currency: 'CAD' },
  chilliwack:       { detached: 820000,  condo: 430000,  rent: 1800, ppsf: 460,  yoy: -1.0,  currency: 'CAD' },
  kamloops:         { detached: 680000,  condo: 360000,  rent: 1700, ppsf: 390,  yoy: 1.0,   currency: 'CAD' },
  nanaimo:          { detached: 720000,  condo: 400000,  rent: 1800, ppsf: 430,  yoy: 0.5,   currency: 'CAD' },
  // Alberta
  calgary:          { detached: 720000,  condo: 340000,  rent: 2100, ppsf: 420,  yoy: 2.4,   currency: 'CAD' },
  edmonton:         { detached: 520000,  condo: 220000,  rent: 1700, ppsf: 280,  yoy: 1.2,   currency: 'CAD' },
  'red deer':       { detached: 420000,  condo: 200000,  rent: 1500, ppsf: 260,  yoy: 3.0,   currency: 'CAD' },
  lethbridge:       { detached: 380000,  condo: 185000,  rent: 1400, ppsf: 240,  yoy: 2.5,   currency: 'CAD' },
  'medicine hat':   { detached: 350000,  condo: 170000,  rent: 1300, ppsf: 230,  yoy: 2.0,   currency: 'CAD' },
  airdrie:          { detached: 590000,  condo: 290000,  rent: 1900, ppsf: 360,  yoy: 2.0,   currency: 'CAD' },
  'grande prairie': { detached: 390000,  condo: 180000,  rent: 1450, ppsf: 245,  yoy: 1.5,   currency: 'CAD' },
  // Ontario
  toronto:          { detached: 1350000, condo: 640000,  rent: 2400, ppsf: 870,  yoy: -3.5,  currency: 'CAD' },
  mississauga:      { detached: 1250000, condo: 600000,  rent: 2300, ppsf: 750,  yoy: -3.0,  currency: 'CAD' },
  brampton:         { detached: 1100000, condo: 540000,  rent: 2100, ppsf: 650,  yoy: -2.5,  currency: 'CAD' },
  hamilton:         { detached: 820000,  condo: 470000,  rent: 1900, ppsf: 520,  yoy: -3.0,  currency: 'CAD' },
  london:           { detached: 680000,  condo: 380000,  rent: 1700, ppsf: 410,  yoy: -1.5,  currency: 'CAD' },
  kitchener:        { detached: 760000,  condo: 430000,  rent: 1900, ppsf: 460,  yoy: -2.0,  currency: 'CAD' },
  waterloo:         { detached: 750000,  condo: 420000,  rent: 1900, ppsf: 455,  yoy: -2.0,  currency: 'CAD' },
  cambridge:        { detached: 740000,  condo: 410000,  rent: 1850, ppsf: 450,  yoy: -1.5,  currency: 'CAD' },
  guelph:           { detached: 820000,  condo: 490000,  rent: 2000, ppsf: 510,  yoy: -1.5,  currency: 'CAD' },
  windsor:          { detached: 420000,  condo: 250000,  rent: 1500, ppsf: 280,  yoy: 2.0,   currency: 'CAD' },
  ottawa:           { detached: 780000,  condo: 420000,  rent: 2100, ppsf: 450,  yoy: 1.9,   currency: 'CAD' },
  kingston:         { detached: 620000,  condo: 380000,  rent: 1800, ppsf: 400,  yoy: 1.5,   currency: 'CAD' },
  barrie:           { detached: 720000,  condo: 420000,  rent: 1900, ppsf: 440,  yoy: -1.0,  currency: 'CAD' },
  sudbury:          { detached: 420000,  condo: 240000,  rent: 1500, ppsf: 260,  yoy: 3.0,   currency: 'CAD' },
  'thunder bay':      { detached: 340000,  condo: 200000,  rent: 1300, ppsf: 230,  yoy: 4.0,   currency: 'CAD' },
  oshawa:           { detached: 780000,  condo: 440000,  rent: 1900, ppsf: 470,  yoy: -2.0,  currency: 'CAD' },
  'st. catharines': { detached: 650000,  condo: 380000,  rent: 1750, ppsf: 400,  yoy: -1.0,  currency: 'CAD' },
  // Quebec
  montreal:         { detached: 620000,  condo: 430000,  rent: 1970, ppsf: 380,  yoy: 6.6,   currency: 'CAD' },
  'quebec city':    { detached: 400000,  condo: 280000,  rent: 1500, ppsf: 270,  yoy: 13.4,  currency: 'CAD' },
  laval:            { detached: 590000,  condo: 400000,  rent: 1900, ppsf: 360,  yoy: 5.0,   currency: 'CAD' },
  longueuil:        { detached: 560000,  condo: 380000,  rent: 1800, ppsf: 340,  yoy: 5.5,   currency: 'CAD' },
  gatineau:         { detached: 480000,  condo: 290000,  rent: 1600, ppsf: 310,  yoy: 3.0,   currency: 'CAD' },
  sherbrooke:       { detached: 370000,  condo: 240000,  rent: 1400, ppsf: 250,  yoy: 7.0,   currency: 'CAD' },
  saguenay:         { detached: 280000,  condo: 180000,  rent: 1100, ppsf: 180,  yoy: 5.0,   currency: 'CAD' },
  'trois-rivieres': { detached: 290000,  condo: 185000,  rent: 1150, ppsf: 195,  yoy: 8.0,   currency: 'CAD' },
  // Manitoba
  winnipeg:         { detached: 410000,  condo: 240000,  rent: 1550, ppsf: 270,  yoy: 6.5,   currency: 'CAD' },
  // Saskatchewan
  saskatoon:        { detached: 390000,  condo: 220000,  rent: 1450, ppsf: 255,  yoy: 6.0,   currency: 'CAD' },
  regina:           { detached: 345000,  condo: 195000,  rent: 1350, ppsf: 230,  yoy: 4.0,   currency: 'CAD' },
  // Nova Scotia
  halifax:          { detached: 520000,  condo: 340000,  rent: 1900, ppsf: 340,  yoy: -0.8,  currency: 'CAD' },
  // New Brunswick
  moncton:          { detached: 320000,  condo: 200000,  rent: 1350, ppsf: 215,  yoy: 5.0,   currency: 'CAD' },
  fredericton:      { detached: 290000,  condo: 185000,  rent: 1250, ppsf: 200,  yoy: 4.0,   currency: 'CAD' },
  'saint john':     { detached: 270000,  condo: 170000,  rent: 1200, ppsf: 190,  yoy: 3.5,   currency: 'CAD' },
  // PEI
  charlottetown:    { detached: 380000,  condo: 250000,  rent: 1500, ppsf: 270,  yoy: 2.0,   currency: 'CAD' },
  // Newfoundland
  'st. john\'s':    { detached: 310000,  condo: 200000,  rent: 1300, ppsf: 210,  yoy: 4.0,   currency: 'CAD' },
}

// ─── UNITED STATES (USD) ─────────────────────────────────────────────────────

const US = {
  // California
  'san jose':        { detached: 1626000, condo: 850000,  rent: 3100, ppsf: 870,  yoy: 1.6,   currency: 'USD' },
  'san francisco':   { detached: 1181000, condo: 740000,  rent: 3200, ppsf: 980,  yoy: -2.4,  currency: 'USD' },
  'los angeles':     { detached: 890000,  condo: 590000,  rent: 2800, ppsf: 680,  yoy: 2.0,   currency: 'USD' },
  'san diego':       { detached: 895000,  condo: 580000,  rent: 2700, ppsf: 690,  yoy: -0.6,  currency: 'USD' },
  anaheim:           { detached: 830000,  condo: 540000,  rent: 2500, ppsf: 620,  yoy: 1.5,   currency: 'USD' },
  sacramento:        { detached: 520000,  condo: 340000,  rent: 1900, ppsf: 360,  yoy: 1.0,   currency: 'USD' },
  fresno:            { detached: 380000,  condo: 260000,  rent: 1600, ppsf: 260,  yoy: 2.5,   currency: 'USD' },
  bakersfield:       { detached: 340000,  condo: 230000,  rent: 1500, ppsf: 230,  yoy: 3.0,   currency: 'USD' },
  riverside:         { detached: 590000,  condo: 380000,  rent: 2100, ppsf: 410,  yoy: 2.0,   currency: 'USD' },
  stockton:          { detached: 420000,  condo: 280000,  rent: 1700, ppsf: 290,  yoy: 2.0,   currency: 'USD' },
  irvine:            { detached: 1350000, condo: 820000,  rent: 3000, ppsf: 810,  yoy: 2.5,   currency: 'USD' },
  oakland:           { detached: 780000,  condo: 510000,  rent: 2500, ppsf: 590,  yoy: -1.5,  currency: 'USD' },
  // Washington
  seattle:           { detached: 728000,  condo: 460000,  rent: 2100, ppsf: 530,  yoy: -2.3,  currency: 'USD' },
  spokane:           { detached: 340000,  condo: 230000,  rent: 1400, ppsf: 230,  yoy: 3.0,   currency: 'USD' },
  tacoma:            { detached: 520000,  condo: 340000,  rent: 1800, ppsf: 370,  yoy: 1.0,   currency: 'USD' },
  bellevue:          { detached: 1200000, condo: 720000,  rent: 2600, ppsf: 750,  yoy: -1.5,  currency: 'USD' },
  // Oregon
  portland:          { detached: 520000,  condo: 340000,  rent: 1700, ppsf: 360,  yoy: -1.0,  currency: 'USD' },
  eugene:            { detached: 420000,  condo: 280000,  rent: 1500, ppsf: 290,  yoy: 1.5,   currency: 'USD' },
  // Nevada
  'las vegas':       { detached: 430000,  condo: 270000,  rent: 1700, ppsf: 280,  yoy: 2.0,   currency: 'USD' },
  reno:              { detached: 520000,  condo: 330000,  rent: 1800, ppsf: 340,  yoy: 1.5,   currency: 'USD' },
  // Arizona
  phoenix:           { detached: 430000,  condo: 280000,  rent: 1700, ppsf: 270,  yoy: 1.0,   currency: 'USD' },
  tucson:            { detached: 310000,  condo: 200000,  rent: 1300, ppsf: 200,  yoy: 2.5,   currency: 'USD' },
  scottsdale:        { detached: 780000,  condo: 480000,  rent: 2200, ppsf: 470,  yoy: 1.5,   currency: 'USD' },
  mesa:              { detached: 390000,  condo: 250000,  rent: 1600, ppsf: 250,  yoy: 1.0,   currency: 'USD' },
  chandler:          { detached: 520000,  condo: 330000,  rent: 1800, ppsf: 320,  yoy: 1.5,   currency: 'USD' },
  // Colorado
  denver:            { detached: 590000,  condo: 380000,  rent: 1900, ppsf: 380,  yoy: -0.5,  currency: 'USD' },
  'colorado springs':{ detached: 420000,  condo: 280000,  rent: 1600, ppsf: 260,  yoy: 1.0,   currency: 'USD' },
  boulder:           { detached: 820000,  condo: 520000,  rent: 2200, ppsf: 540,  yoy: 0.5,   currency: 'USD' },
  aurora:            { detached: 480000,  condo: 310000,  rent: 1700, ppsf: 300,  yoy: -0.5,  currency: 'USD' },
  // Utah
  'salt lake city':  { detached: 540000,  condo: 340000,  rent: 1700, ppsf: 340,  yoy: 0.5,   currency: 'USD' },
  provo:             { detached: 470000,  condo: 300000,  rent: 1600, ppsf: 300,  yoy: 1.0,   currency: 'USD' },
  // Texas
  houston:           { detached: 310000,  condo: 210000,  rent: 1500, ppsf: 180,  yoy: 1.5,   currency: 'USD' },
  dallas:            { detached: 380000,  condo: 250000,  rent: 1700, ppsf: 220,  yoy: 0.5,   currency: 'USD' },
  austin:            { detached: 530000,  condo: 350000,  rent: 1800, ppsf: 310,  yoy: -5.0,  currency: 'USD' },
  'san antonio':     { detached: 280000,  condo: 190000,  rent: 1300, ppsf: 170,  yoy: -1.0,  currency: 'USD' },
  'fort worth':      { detached: 320000,  condo: 210000,  rent: 1500, ppsf: 190,  yoy: 0.5,   currency: 'USD' },
  'el paso':           { detached: 230000,  condo: 155000,  rent: 1100, ppsf: 150,  yoy: 3.0,   currency: 'USD' },
  arlington:         { detached: 310000,  condo: 200000,  rent: 1500, ppsf: 185,  yoy: 0.5,   currency: 'USD' },
  plano:             { detached: 490000,  condo: 310000,  rent: 1900, ppsf: 270,  yoy: 0.5,   currency: 'USD' },
  // Florida
  miami:             { detached: 680000,  condo: 420000,  rent: 2400, ppsf: 430,  yoy: 2.0,   currency: 'USD' },
  orlando:           { detached: 380000,  condo: 240000,  rent: 1700, ppsf: 230,  yoy: 1.5,   currency: 'USD' },
  tampa:             { detached: 390000,  condo: 250000,  rent: 1800, ppsf: 240,  yoy: -2.0,  currency: 'USD' },
  jacksonville:      { detached: 310000,  condo: 200000,  rent: 1500, ppsf: 195,  yoy: 1.0,   currency: 'USD' },
  'fort lauderdale': { detached: 580000,  condo: 370000,  rent: 2200, ppsf: 360,  yoy: 1.5,   currency: 'USD' },
  'west palm beach': { detached: 620000,  condo: 390000,  rent: 2300, ppsf: 380,  yoy: 5.0,   currency: 'USD' },
  'st. petersburg':  { detached: 420000,  condo: 270000,  rent: 1800, ppsf: 265,  yoy: -1.0,  currency: 'USD' },
  naples:            { detached: 780000,  condo: 480000,  rent: 2500, ppsf: 490,  yoy: 0.5,   currency: 'USD' },
  // Georgia
  atlanta:           { detached: 380000,  condo: 260000,  rent: 1700, ppsf: 230,  yoy: 3.0,   currency: 'USD' },
  savannah:          { detached: 320000,  condo: 220000,  rent: 1500, ppsf: 210,  yoy: 4.0,   currency: 'USD' },
  // North Carolina
  charlotte:         { detached: 380000,  condo: 250000,  rent: 1700, ppsf: 230,  yoy: 2.5,   currency: 'USD' },
  raleigh:           { detached: 420000,  condo: 280000,  rent: 1800, ppsf: 260,  yoy: 2.0,   currency: 'USD' },
  durham:            { detached: 380000,  condo: 260000,  rent: 1700, ppsf: 240,  yoy: 2.5,   currency: 'USD' },
  // Tennessee
  nashville:         { detached: 490000,  condo: 320000,  rent: 1800, ppsf: 290,  yoy: 1.0,   currency: 'USD' },
  memphis:           { detached: 195000,  condo: 135000,  rent: 1100, ppsf: 120,  yoy: 2.0,   currency: 'USD' },
  knoxville:         { detached: 310000,  condo: 210000,  rent: 1400, ppsf: 200,  yoy: 3.5,   currency: 'USD' },
  // South Carolina
  charleston:        { detached: 490000,  condo: 320000,  rent: 1900, ppsf: 310,  yoy: 3.0,   currency: 'USD' },
  columbia:          { detached: 240000,  condo: 165000,  rent: 1200, ppsf: 155,  yoy: 3.5,   currency: 'USD' },
  // New York
  'new york':        { detached: 651000,  condo: 620000,  rent: 3500, ppsf: 840,  yoy: 1.5,   currency: 'USD' },
  buffalo:           { detached: 220000,  condo: 155000,  rent: 1200, ppsf: 140,  yoy: 5.0,   currency: 'USD' },
  rochester:         { detached: 210000,  condo: 145000,  rent: 1100, ppsf: 135,  yoy: 6.0,   currency: 'USD' },
  albany:            { detached: 270000,  condo: 185000,  rent: 1300, ppsf: 175,  yoy: 7.0,   currency: 'USD' },
  // Massachusetts
  boston:            { detached: 720000,  condo: 590000,  rent: 2800, ppsf: 680,  yoy: 3.0,   currency: 'USD' },
  worcester:         { detached: 390000,  condo: 300000,  rent: 1700, ppsf: 290,  yoy: 5.0,   currency: 'USD' },
  cambridge:         { detached: 980000,  condo: 760000,  rent: 3100, ppsf: 850,  yoy: 2.0,   currency: 'USD' },
  // Connecticut
  bridgeport:        { detached: 663000,  condo: 380000,  rent: 2100, ppsf: 340,  yoy: 12.4,  currency: 'USD' },
  hartford:          { detached: 260000,  condo: 175000,  rent: 1300, ppsf: 170,  yoy: 8.0,   currency: 'USD' },
  // New Jersey
  newark:            { detached: 420000,  condo: 310000,  rent: 1900, ppsf: 290,  yoy: 4.0,   currency: 'USD' },
  'jersey city':     { detached: 620000,  condo: 480000,  rent: 2400, ppsf: 480,  yoy: 3.5,   currency: 'USD' },
  // Pennsylvania
  philadelphia:      { detached: 280000,  condo: 200000,  rent: 1500, ppsf: 180,  yoy: 4.5,   currency: 'USD' },
  pittsburgh:        { detached: 220000,  condo: 155000,  rent: 1200, ppsf: 140,  yoy: 5.0,   currency: 'USD' },
  allentown:         { detached: 280000,  condo: 185000,  rent: 1300, ppsf: 180,  yoy: 6.0,   currency: 'USD' },
  // Maryland
  baltimore:         { detached: 250000,  condo: 175000,  rent: 1400, ppsf: 165,  yoy: 4.0,   currency: 'USD' },
  // Virginia
  'virginia beach':  { detached: 330000,  condo: 230000,  rent: 1500, ppsf: 205,  yoy: 3.5,   currency: 'USD' },
  richmond:          { detached: 370000,  condo: 250000,  rent: 1600, ppsf: 235,  yoy: 4.0,   currency: 'USD' },
  arlington:         { detached: 820000,  condo: 540000,  rent: 2400, ppsf: 530,  yoy: 2.0,   currency: 'USD' },
  // DC
  'washington':      { detached: 680000,  condo: 450000,  rent: 2200, ppsf: 480,  yoy: 2.0,   currency: 'USD' },
  // Ohio
  columbus:          { detached: 290000,  condo: 200000,  rent: 1300, ppsf: 180,  yoy: 5.0,   currency: 'USD' },
  cleveland:         { detached: 175000,  condo: 120000,  rent: 1050, ppsf: 110,  yoy: 5.5,   currency: 'USD' },
  cincinnati:        { detached: 260000,  condo: 175000,  rent: 1250, ppsf: 165,  yoy: 5.0,   currency: 'USD' },
  akron:             { detached: 185000,  condo: 130000,  rent: 1050, ppsf: 115,  yoy: 5.0,   currency: 'USD' },
  toledo:            { detached: 165000,  condo: 115000,  rent: 1000, ppsf: 105,  yoy: 5.5,   currency: 'USD' },
  // Michigan
  detroit:           { detached: 203000,  condo: 140000,  rent: 1100, ppsf: 120,  yoy: 6.2,   currency: 'USD' },
  'grand rapids':    { detached: 310000,  condo: 220000,  rent: 1400, ppsf: 195,  yoy: 4.5,   currency: 'USD' },
  lansing:           { detached: 220000,  condo: 155000,  rent: 1100, ppsf: 140,  yoy: 4.0,   currency: 'USD' },
  // Illinois
  chicago:           { detached: 340000,  condo: 270000,  rent: 1800, ppsf: 230,  yoy: 4.0,   currency: 'USD' },
  aurora:            { detached: 310000,  condo: 210000,  rent: 1500, ppsf: 190,  yoy: 3.5,   currency: 'USD' },
  rockford:          { detached: 160000,  condo: 110000,  rent: 950,  ppsf: 100,  yoy: 4.0,   currency: 'USD' },
  // Indiana
  indianapolis:      { detached: 255000,  condo: 175000,  rent: 1200, ppsf: 155,  yoy: 4.5,   currency: 'USD' },
  'fort wayne':      { detached: 220000,  condo: 150000,  rent: 1100, ppsf: 140,  yoy: 5.0,   currency: 'USD' },
  // Wisconsin
  milwaukee:         { detached: 240000,  condo: 165000,  rent: 1200, ppsf: 150,  yoy: 5.5,   currency: 'USD' },
  madison:           { detached: 380000,  condo: 270000,  rent: 1600, ppsf: 240,  yoy: 4.0,   currency: 'USD' },
  // Minnesota
  minneapolis:       { detached: 340000,  condo: 230000,  rent: 1500, ppsf: 210,  yoy: 3.0,   currency: 'USD' },
  'saint paul':      { detached: 290000,  condo: 195000,  rent: 1400, ppsf: 185,  yoy: 3.0,   currency: 'USD' },
  // Missouri
  'kansas city':     { detached: 270000,  condo: 185000,  rent: 1300, ppsf: 170,  yoy: 4.0,   currency: 'USD' },
  'st. louis':       { detached: 235000,  condo: 160000,  rent: 1200, ppsf: 150,  yoy: 4.5,   currency: 'USD' },
  // Nebraska
  omaha:             { detached: 290000,  condo: 195000,  rent: 1300, ppsf: 180,  yoy: 4.5,   currency: 'USD' },
  // Iowa
  'des moines':      { detached: 270000,  condo: 180000,  rent: 1200, ppsf: 165,  yoy: 4.0,   currency: 'USD' },
  // Kansas
  'wichita':         { detached: 210000,  condo: 145000,  rent: 1050, ppsf: 130,  yoy: 3.5,   currency: 'USD' },
  // Oklahoma
  'oklahoma city':   { detached: 215000,  condo: 145000,  rent: 1050, ppsf: 130,  yoy: 3.0,   currency: 'USD' },
  tulsa:             { detached: 200000,  condo: 135000,  rent: 1000, ppsf: 120,  yoy: 3.5,   currency: 'USD' },
  // Louisiana
  'new orleans':     { detached: 260000,  condo: 185000,  rent: 1300, ppsf: 170,  yoy: 1.0,   currency: 'USD' },
  // Arkansas
  'little rock':     { detached: 210000,  condo: 145000,  rent: 1050, ppsf: 130,  yoy: 3.5,   currency: 'USD' },
  // Mississippi
  jackson:           { detached: 165000,  condo: 115000,  rent: 950,  ppsf: 100,  yoy: 2.5,   currency: 'USD' },
  // Alabama
  birmingham:        { detached: 225000,  condo: 155000,  rent: 1100, ppsf: 140,  yoy: 4.0,   currency: 'USD' },
  // Kentucky
  louisville:        { detached: 265000,  condo: 180000,  rent: 1200, ppsf: 165,  yoy: 4.5,   currency: 'USD' },
  lexington:         { detached: 300000,  condo: 205000,  rent: 1350, ppsf: 185,  yoy: 4.5,   currency: 'USD' },
  // West Virginia
  charleston:        { detached: 170000,  condo: 115000,  rent: 950,  ppsf: 105,  yoy: 3.0,   currency: 'USD' },
  // Idaho
  boise:             { detached: 470000,  condo: 300000,  rent: 1600, ppsf: 290,  yoy: -2.0,  currency: 'USD' },
  // Montana
  billings:          { detached: 380000,  condo: 245000,  rent: 1500, ppsf: 240,  yoy: 2.0,   currency: 'USD' },
  // New Mexico
  albuquerque:       { detached: 320000,  condo: 215000,  rent: 1400, ppsf: 200,  yoy: 3.0,   currency: 'USD' },
  // Hawaii
  honolulu:          { detached: 950000,  condo: 520000,  rent: 2400, ppsf: 640,  yoy: 1.0,   currency: 'USD' },
  // Alaska
  anchorage:         { detached: 380000,  condo: 235000,  rent: 1600, ppsf: 235,  yoy: 1.5,   currency: 'USD' },
}

// ─── LOOKUP FUNCTION ─────────────────────────────────────────────────────────

/**
 * Get market data for a city — checks local hardcoded data first
 * Returns { detached, condo, rent, ppsf, yoy, currency } or null
 */
export function getMarketData(city, country) {
  if (!city) return null

  const cityLower = city.toLowerCase().trim()
  const isCanada = country?.toLowerCase().includes('canada')
  const dataset = isCanada ? CANADA : US

  // Direct match
  if (dataset[cityLower]) return dataset[cityLower]

  // Partial match
  for (const [key, data] of Object.entries(dataset)) {
    if (cityLower.includes(key) || key.includes(cityLower)) {
      return data
    }
  }

  return null
}

/**
 * Fetch live market data from api/marketdata (Redfin for US, hardcoded for CA)
 * Falls back to getMarketData() if API unavailable
 */
export async function getLiveMarketData(city, country) {
  // Try local first — instant, no network call
  const local = getMarketData(city, country)

  try {
    const params = new URLSearchParams({ city, country: country || '' })
    const res = await fetch(`/api/marketdata?${params}`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return local
    const data = await res.json()
    // Merge live price with local yoy/ppsf if live source doesn't have them
    return {
      detached: data.detached,
      condo: data.condo,
      rent: data.rent,
      ppsf: data.ppsf || local?.ppsf,
      yoy: data.yoy || local?.yoy,
      currency: data.currency,
      source: data.source,
    }
  } catch {
    return local // fallback silently
  }
}

/**
 * Format market data as a string for injection into AI prompt
 */
export function formatMarketDataForPrompt(city, country, currency, overrideData) {
  const data = overrideData || getMarketData(city, country)
  if (!data) return ''

  const sym = currency === 'GBP' ? '£' : currency === 'CAD' ? 'CA$' : '$'
  const fmt = (n) => `${sym}${n?.toLocaleString() ?? 'N/A'}`
  const yoyStr = data.yoy > 0 ? `+${data.yoy}%` : `${data.yoy}%`

  return `
MARKET DATABASE (verified 2025-2026 data for ${city}):
- Median detached home price: ${fmt(data.detached)} ${data.currency}
- Median condo/apartment price: ${fmt(data.condo)} ${data.currency}
- Typical monthly rent: ${fmt(data.rent)} ${data.currency}
- Median price per sqft: ${fmt(data.ppsf)} ${data.currency}/sqft
- Year-over-year price change: ${yoyStr}
CRITICAL INSTRUCTION: Your estimated value MUST be within 15% of the median detached price (${fmt(data.detached)}) or median condo price (${fmt(data.condo)}) depending on the property type. Do not deviate without explicit justification based on the specific property's neighbourhood tier or condition.`
}

// Export raw datasets for other uses
export { CANADA, US }
