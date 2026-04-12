// Shared constants and helpers used by multiple landing-page components

export const LOGO = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663463031725/5FNF4QVCkxSRz6ba3cCadG/dwelling-logo-3AJU9MMgr8YxSGXWKetVFA.webp'
export const HERO_POSTER = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663463031725/5FNF4QVCkxSRz6ba3cCadG/hero-poster-ZHdSBZKm8ENZMaTu9N2eqV.webp'

export function scrollTo(id) {
  const el = document.getElementById(id)
  if (!el) return
  const navH = document.querySelector('nav')?.offsetHeight || 68
  const top = el.getBoundingClientRect().top + window.scrollY - navH - 8
  window.scrollTo({ top, behavior: 'smooth' })
}
