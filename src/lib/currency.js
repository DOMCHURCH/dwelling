// src/lib/currency.js
// Currency detection by country, symbols, and exchange rate fetching

// Full map of country → currency code
const COUNTRY_CURRENCY_MAP = {
  // North America
  'united states': 'USD', 'usa': 'USD', 'us': 'USD',
  'canada': 'CAD',
  'mexico': 'MXN',

  // Europe
  'united kingdom': 'GBP', 'england': 'GBP', 'scotland': 'GBP', 'wales': 'GBP',
  'northern ireland': 'GBP',
  'france': 'EUR', 'germany': 'EUR', 'italy': 'EUR', 'spain': 'EUR',
  'netherlands': 'EUR', 'belgium': 'EUR', 'austria': 'EUR', 'portugal': 'EUR',
  'ireland': 'EUR', 'finland': 'EUR', 'greece': 'EUR', 'luxembourg': 'EUR',
  'malta': 'EUR', 'cyprus': 'EUR', 'slovakia': 'EUR', 'slovenia': 'EUR',
  'estonia': 'EUR', 'latvia': 'EUR', 'lithuania': 'EUR',
  'switzerland': 'CHF', 'liechtenstein': 'CHF',
  'sweden': 'SEK', 'norway': 'NOK', 'denmark': 'DKK',
  'poland': 'PLN', 'czech republic': 'CZK', 'czechia': 'CZK',
  'hungary': 'HUF', 'romania': 'RON', 'bulgaria': 'BGN',
  'croatia': 'EUR', 'serbia': 'RSD', 'ukraine': 'UAH',

  // Asia Pacific
  'australia': 'AUD',
  'new zealand': 'NZD',
  'japan': 'JPY',
  'china': 'CNY',
  'south korea': 'KRW', 'korea': 'KRW',
  'india': 'INR',
  'singapore': 'SGD',
  'hong kong': 'HKD',
  'taiwan': 'TWD',
  'thailand': 'THB',
  'malaysia': 'MYR',
  'indonesia': 'IDR',
  'philippines': 'PHP',
  'vietnam': 'VND',
  'bangladesh': 'BDT',
  'pakistan': 'PKR',
  'sri lanka': 'LKR',
  'myanmar': 'MMK',

  // Middle East
  'united arab emirates': 'AED', 'uae': 'AED',
  'saudi arabia': 'SAR',
  'israel': 'ILS',
  'qatar': 'QAR',
  'kuwait': 'KWD',
  'bahrain': 'BHD',
  'oman': 'OMR',
  'jordan': 'JOD',
  'turkey': 'TRY', 'türkiye': 'TRY',

  // South America
  'brazil': 'BRL',
  'argentina': 'ARS',
  'chile': 'CLP',
  'colombia': 'COP',
  'peru': 'PEN',
  'venezuela': 'VES',
  'ecuador': 'USD',
  'uruguay': 'UYU',
  'paraguay': 'PYG',
  'bolivia': 'BOB',

  // Africa
  'south africa': 'ZAR',
  'nigeria': 'NGN',
  'kenya': 'KES',
  'ghana': 'GHS',
  'egypt': 'EGP',
  'ethiopia': 'ETB',
  'tanzania': 'TZS',
  'uganda': 'UGX',
  'morocco': 'MAD',

  // Other
  'russia': 'RUB',
  'ukraine': 'UAH',
  'iceland': 'ISK',
}

// Currency symbols
const CURRENCY_SYMBOLS = {
  USD: '$', CAD: 'CA$', GBP: '£', EUR: '€', AUD: 'A$', NZD: 'NZ$',
  JPY: '¥', CNY: '¥', KRW: '₩', INR: '₹', CHF: 'Fr', SEK: 'kr',
  NOK: 'kr', DKK: 'kr', PLN: 'zł', CZK: 'Kč', HUF: 'Ft', RON: 'lei',
  BGN: 'лв', HRK: 'kn', RSD: 'din', UAH: '₴', RUB: '₽', TRY: '₺',
  MXN: 'MX$', BRL: 'R$', ARS: '$', CLP: '$', COP: '$', PEN: 'S/',
  VES: 'Bs', UYU: '$U', BTC: '₿', ETH: 'Ξ',
  SGD: 'S$', HKD: 'HK$', TWD: 'NT$', THB: '฿', MYR: 'RM', IDR: 'Rp',
  PHP: '₱', VND: '₫', BDT: '৳', PKR: '₨', LKR: '₨',
  AED: 'د.إ', SAR: '﷼', ILS: '₪', QAR: '﷼', KWD: 'د.ك',
  ZAR: 'R', NGN: '₦', KES: 'KSh', EGP: '£', GHS: 'GH₵', MAD: 'د.م.',
  ISK: 'kr',
}

// Currency names for display
const CURRENCY_NAMES = {
  USD: 'US Dollar', CAD: 'Canadian Dollar', GBP: 'British Pound',
  EUR: 'Euro', AUD: 'Australian Dollar', NZD: 'New Zealand Dollar',
  JPY: 'Japanese Yen', CNY: 'Chinese Yuan', KRW: 'South Korean Won',
  INR: 'Indian Rupee', CHF: 'Swiss Franc', SEK: 'Swedish Krona',
  NOK: 'Norwegian Krone', DKK: 'Danish Krone', MXN: 'Mexican Peso',
  BRL: 'Brazilian Real', ARS: 'Argentine Peso', CLP: 'Chilean Peso',
  COP: 'Colombian Peso', PEN: 'Peruvian Sol', SGD: 'Singapore Dollar',
  HKD: 'Hong Kong Dollar', THB: 'Thai Baht', MYR: 'Malaysian Ringgit',
  IDR: 'Indonesian Rupiah', PHP: 'Philippine Peso', AED: 'UAE Dirham',
  SAR: 'Saudi Riyal', ILS: 'Israeli Shekel', TRY: 'Turkish Lira',
  ZAR: 'South African Rand', NGN: 'Nigerian Naira',
}

/**
 * Detect currency code from country string
 */
export function getCurrencyFromCountry(country) {
  if (!country) return 'USD'
  const lower = country.toLowerCase().trim()
  // Check direct match first
  for (const [key, code] of Object.entries(COUNTRY_CURRENCY_MAP)) {
    if (lower.includes(key)) return code
  }
  return 'USD' // Default to USD
}

/**
 * Get currency symbol for a currency code
 */
export function getCurrencySymbol(code) {
  return CURRENCY_SYMBOLS[code] || code + ' '
}

/**
 * Get currency name for display
 */
export function getCurrencyName(code) {
  return CURRENCY_NAMES[code] || code
}

/**
 * Format a number as currency
 */
export function formatCurrency(amount, currencyCode, options = {}) {
  if (amount == null || amount === 0) return '—'
  const sym = getCurrencySymbol(currencyCode)
  const formatted = Math.round(amount).toLocaleString('en-US', { maximumFractionDigits: 0 })
  // For currencies that go after the number
  const postfix = ['SEK', 'NOK', 'DKK', 'ISK'].includes(currencyCode)
  return postfix ? `${formatted} ${sym}` : `${sym}${formatted}`
}

/**
 * Fetch live exchange rates from our /api/exchange endpoint
 * Returns rates object: { USD: 1, CAD: 1.38, GBP: 0.79, ... }
 */
export async function fetchExchangeRates(baseCurrency = 'USD') {
  try {
    const res = await fetch(`/api/exchange?base=${baseCurrency}`)
    if (!res.ok) throw new Error('Exchange API failed')
    const data = await res.json()
    return data.rates || {}
  } catch (err) {
    console.warn('Exchange rate fetch failed, using fallback:', err.message)
    return getHardcodedRates(baseCurrency)
  }
}

/**
 * Convert an amount from one currency to another
 */
export function convertCurrency(amount, fromCurrency, toCurrency, rates) {
  if (!amount || fromCurrency === toCurrency) return amount
  if (!rates) return amount
  // rates are relative to a base currency
  // If rates are based on USD: amount_in_to = amount_in_from * (rate_to / rate_from)
  const fromRate = rates[fromCurrency] || 1
  const toRate = rates[toCurrency] || 1
  return Math.round((amount / fromRate) * toRate)
}

function getHardcodedRates(base) {
  const usdRates = {
    USD: 1.0, CAD: 1.38, GBP: 0.79, EUR: 0.92, AUD: 1.55, NZD: 1.68,
    JPY: 149.5, CHF: 0.89, CNY: 7.24, INR: 83.1, MXN: 17.2, BRL: 4.97,
    KRW: 1325.0, SGD: 1.34, HKD: 7.82, SEK: 10.4, NOK: 10.6, DKK: 6.88,
    ZAR: 18.6, AED: 3.67, SAR: 3.75, THB: 35.1, MYR: 4.72, IDR: 15650.0,
    PHP: 56.5, TRY: 32.2, PLN: 4.02, CZK: 23.1, HUF: 357.0, ILS: 3.67,
  }
  if (base === 'USD') return usdRates
  const baseRate = usdRates[base] || 1.0
  const converted = {}
  for (const [cur, rate] of Object.entries(usdRates)) {
    converted[cur] = Math.round((rate / baseRate) * 10000) / 10000
  }
  return converted
}
