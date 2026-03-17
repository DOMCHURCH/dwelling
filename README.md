# Dwelling — Property Intelligence App

Enter any address in the world and get a full property intelligence report including estimated value, cost of living, climate data, neighborhood scores, floor plan info, and investment analysis.

## APIs Used

| API | Key Required | Cost |
|-----|-------------|------|
| [Nominatim](https://nominatim.openstreetmap.org) | No | Free forever |
| [Open-Meteo](https://open-meteo.com) | No | Free forever |
| [Countriesnow](https://countriesnow.space) | No | Free forever |
| [Groq](https://console.groq.com) | Yes (free) | Free tier, no credit card |

## Setup

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/dwelling
cd dwelling
```

### 2. Install dependencies
```bash
npm install
```

### 3. Add your Groq API key
Create a `.env` file in the root (never commit this):
```
VITE_GROQ_API_KEY=your_groq_key_here
```

Get your free key at [console.groq.com](https://console.groq.com) — no credit card needed.

### 4. Run locally
```bash
npm run dev
```

### 5. Build for production
```bash
npm run build
```

## Deploy

### Netlify
1. Push to GitHub
2. Connect repo on [netlify.com](https://netlify.com)
3. Set build command: `npm run build`
4. Set publish directory: `dist`
5. Add environment variable: `VITE_GROQ_API_KEY` in Site Settings → Environment Variables

### Vercel
1. Push to GitHub
2. Import on [vercel.com](https://vercel.com)
3. Add `VITE_GROQ_API_KEY` in Project Settings → Environment Variables

## Project Structure

```
dwelling/
├── src/
│   ├── lib/
│   │   ├── nominatim.js     # Address geocoding + autocomplete
│   │   ├── weather.js       # Climate + forecast data
│   │   ├── countriesnow.js  # Country/city data
│   │   └── groq.js          # AI property analysis
│   ├── components/
│   │   ├── AddressSearch.jsx
│   │   ├── Dashboard.jsx
│   │   ├── LoadingState.jsx
│   │   ├── ScoreRing.jsx
│   │   ├── SectionCard.jsx
│   │   └── StatCard.jsx
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── .env.example             # Safe to commit — shows required keys
├── .gitignore               # .env is gitignored
└── vite.config.js
```

## Disclaimer

All property estimates and scores are AI-generated approximations for informational purposes only. Not financial or legal advice.
