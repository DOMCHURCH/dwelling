# Dwelling — Application d'Intelligence Immobilière

**Site en direct : [dwelling.one](https://dwelling.one)**

Entrez n'importe quelle adresse dans le monde et obtenez un rapport complet d'intelligence immobilière comprenant la valeur estimée, le coût de la vie, les données climatiques, les scores de quartier, les informations sur les plans d'étage et l'analyse des investissements.

## API Utilisées

| API | Clé Requise | Coût |
|-----|-------------|------|
| [Nominatim (OpenStreetMap)](https://nominatim.openstreetmap.org) | Non | Gratuit pour toujours |
| [Open-Meteo](https://open-meteo.com) | Non | Gratuit pour toujours |
| [Countriesnow](https://countriesnow.space) | Non | Gratuit pour toujours |
| [Overpass / OpenStreetMap](https://overpass-api.de) | Non | Gratuit pour toujours |
| [Cerebras](https://cloud.cerebras.ai) | Oui (gratuit) | Tier gratuit |
| [Turso (libSQL)](https://turso.tech) | Oui (gratuit) | Tier gratuit |
| [Upstash Redis](https://upstash.com) | Oui (gratuit) | Tier gratuit |
| [Resend](https://resend.com) | Oui (gratuit) | Tier gratuit |
| [Stripe](https://stripe.com) | Oui (payant) | Selon l'utilisation |
| [Google News RSS](https://news.google.com) | Non | Gratuit pour toujours |
| [Redfin Public Data (S3)](https://redfin-public-data.s3.us-west-2.amazonaws.com) | Non | Gratuit pour toujours |
| [Frankfurter API](https://www.frankfurter.app) | Non | Gratuit pour toujours |
| [Socrata API (Edmonton, Calgary Open Data)](https://www.socrata.com) | Non | Gratuit pour toujours |
| [CKAN API (Vancouver Open Data)](https://ckan.org) | Non | Gratuit pour toujours |
| [Realtor.ca API](https://www.realtor.ca/api) | Non | Gratuit pour toujours |

## Déploiement (Vercel)

1. Pousser vers GitHub
2. Importer sur [vercel.com](https://vercel.com)
3. Ajouter toutes les variables d'environnement dans Project Settings → Environment Variables
4. Vercel détecte automatiquement Vite — aucune modification de la commande de build n'est nécessaire

## Structure du Projet

```
dwelling/
├── .claude/
│   ├── skills/
│   │   ├── coding-helper.md
│   │   └── parallax-3d-ui.md
│   └── settings.local.json
├── .github/workflows/
│   ├── claude-code-review.yml
│   └── claude.yml
├── api/
│   ├── _ratelimit.js          # Gestion du taux de requêtes
│   ├── auth.js                # Authentification utilisateur, gestion des abonnements Stripe
│   ├── cerebras.js            # Proxy pour l'analyse IA de Cerebras
│   ├── comps.js               # Comparables immobiliers (Realtor.ca)
│   ├── cron/
│   │   └── precompute-noise-zones.js
│   ├── exchange.js            # Taux de change (Frankfurter API)
│   ├── external.js            # Gestion des API externes
│   ├── marketdata.js          # Données du marché (Redfin Public Data)
│   ├── news.js                # Actualités immobilières locales (Google News RSS)
│   ├── overpass.js            # Proxy pour les scores de quartier (Overpass API)
│   ├── risk.js                # Calcul du risque (bruit, etc.)
│   └── statcan.js             # Données statistiques canadiennes (StatCan, données municipales)
├── hooks/
│   ├── useCountUp.js
│   ├── useInView.js
│   └── useScrollReveal.js
├── public/
│   ├── 404.html
│   ├── apple-touch-icon.png
│   ├── favicon-96x96.png
│   ├── favicon.ico
│   ├── favicon.svg
│   ├── hero-far.webp
│   ├── hero-near.jpg
│   ├── hero-sky.jpg
│   ├── pricing-bg.webm
│   ├── robots.txt
│   ├── site.webmanifest
│   ├── sitemap.xml
│   ├── web-app-manifest-192x192.png
│   └── web-app-manifest-512x512.png
├── src/
│   ├── components/
│   │   ├── AddressSearch.jsx
│   │   ├── AuthModal.jsx
│   │   ├── BlurText.jsx
│   │   ├── CompareView.jsx
│   │   ├── CookieBanner.jsx
│   │   ├── CountUp.jsx
│   │   ├── CursorTrail.jsx
│   │   ├── Dashboard.jsx
│   │   ├── DeleteAccountModal.jsx
│   │   ├── GlobalBackground.jsx
│   │   ├── LoadingState.jsx
│   │   ├── PaywallModal.jsx
│   │   ├── PriceHistoryChart.jsx
│   │   ├── ScoreRing.jsx
│   │   ├── ScrollScene.jsx
│   │   ├── SectionCard.jsx
│   │   ├── StatCard.jsx
│   │   └── TermsPage.jsx
│   ├── lib/
│   │   ├── appHelpers.js      # Fonctions utilitaires de l'application
│   │   ├── areaAnalysis.js    # Analyse de zone et calcul de scores de risque
│   │   ├── asyncManager.js    # Gestionnaire asynchrone
│   │   ├── avm.js             # Modèle de valorisation automatisée
│   │   ├── cerebras.js        # Client Cerebras AI
│   │   ├── countriesnow.js    # Informations sur les pays et villes
│   │   ├── currency.js        # Fonctions de gestion des devises
│   │   ├── demoData.js        # Données de démonstration
│   │   ├── errorHandler.js    # Gestionnaire d'erreurs
│   │   ├── localAuth.js       # Fonctions d'authentification locales
│   │   ├── marketPrices.js    # Prix du marché
│   │   ├── nominatim.js       # Géocodage d'adresses (Nominatim)
│   │   ├── overpass.js        # Client Overpass API
│   │   ├── sanitize.js        # Fonctions de nettoyage de données
│   │   ├── useSafeAsync.js    # Hook pour la gestion asynchrone sécurisée
│   │   └── weather.js         # Données météorologiques (Open-Meteo)
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── .env.example
├── .gitignore
├── README.md
├── index.html
├── package-lock.json
├── package.json
├── vercel.json
└── vite.config.js
```

## Tarification

| Plan | Prix | Analyses |
|------|-------|----------|
| Gratuit | 0 $/mois | 10/mois (accès partiel aux informations) |
| Pro | 19 $/mois | Illimité |
| Annuel | 12 $/mois (facturé annuellement) | Illimité |

## Clause de non-responsabilité

Toutes les estimations et scores de propriété sont des approximations générées par l'IA à des fins d'information uniquement. Ce n'est pas un conseil financier ou juridique.
