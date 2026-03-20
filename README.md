# Dwelling — Property Intelligence App

**Live site: [dwelling-three.vercel.app](https://dwelling-three.vercel.app)**

Enter any address in the world and get a full property intelligence report including estimated value, cost of living, climate data, neighborhood scores, floor plan info, and investment analysis.

## APIs Used

| API | Key Required | Cost |
|-----|-------------|------|
| [Nominatim](https://nominatim.openstreetmap.org) | No | Free forever |
| [Open-Meteo](https://open-meteo.com) | No | Free forever |
| [Countriesnow](https://countriesnow.space) | No | Free forever |
| [Overpass / OpenStreetMap](https://overpass-api.de) | No | Free forever |
| [US Census Bureau](https://api.census.gov) | No | Free forever |
| [HUD API](https://www.huduser.gov/portal/dataset/fmr-api.html) | No | Free forever |
| [FEMA Flood Map](https://msc.fema.gov/arcgis/rest/services) | No | Free forever |
| [Cerebras](https://cloud.cerebras.ai) | Yes (free) | Free tier |
| [Supabase](https://supabase.com) | Yes (free) | Free tier |

## Deploy (Vercel)

1. Push to GitHub
2. Import on [vercel.com](https://vercel.com)
3. Add all environment variables in Project Settings → Environment Variables
4. Vercel auto-detects Vite — no build command changes needed

## Project Structure

```
dwelling/
├── api/
│   ├── cerebras.js          # AI property analysis (serverless)
│   ├── fema.js              # Flood zone lookup (serverless)
│   └── register.js          # User registration (serverless)
├── src/
│   ├── lib/
│   │   ├── nominatim.js     # Address geocoding
│   │   ├── weather.js       # Climate + forecast data
│   │   ├── overpass.js      # Neighborhood scores from OSM
│   │   ├── census.js        # US Census housing data
│   │   ├── hud.js           # Fair market rents + flood zones
│   │   ├── cerebras.js      # AI analysis client
│   │   └── supabase.js      # Auth + database client
│   ├── components/
│   │   ├── AddressSearch.jsx
│   │   ├── AuthModal.jsx
│   │   ├── Dashboard.jsx
│   │   ├── GlobalBackground.jsx
│   │   ├── LoadingState.jsx
│   │   ├── PaywallModal.jsx
│   │   ├── PriceHistoryChart.jsx
│   │   ├── ScoreRing.jsx
│   │   ├── SectionCard.jsx
│   │   └── StatCard.jsx
│   ├── hooks/
│   │   ├── useCountUp.js
│   │   └── useInView.js
│   ├── App.jsx
│   ├── images.js
│   ├── main.jsx
│   └── index.css
├── .env.example
├── .gitignore
├── vercel.json
└── vite.config.js
```

## Pricing

| Plan | Price | Analyses |
|------|-------|----------|
| Free | $0/month | 10/month |
| Pro | $9/month | Unlimited |

## Disclaimer

All property estimates and scores are AI-generated approximations for informational purposes only. Not financial or legal advice.
