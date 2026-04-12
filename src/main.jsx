import React, { lazy, Suspense } from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import * as Sentry from "@sentry/react"
import { inject } from "@vercel/analytics"
import App from "./App.jsx"
import "./index.css"
import "./lib/errorHandler"

const TermsPage = lazy(() => import("./components/TermsPage.jsx"))
const BusinessLayout = lazy(() => import("./components/BusinessLayout.jsx"))

inject()

Sentry.init({
  dsn: "https://ff491837eb0fad4aa41f42ee31db99aa@o4511169279492096.ingest.us.sentry.io/4511169300856832",
  environment: import.meta.env.MODE,
  sendDefaultPii: false,
  tracesSampleRate: 0.2,
  integrations: [Sentry.browserTracingIntegration()],
})

const isTerms = window.location.pathname === "/terms"

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Sentry.ErrorBoundary
        fallback={
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100vh",
              background: "#000",
              color: "rgba(255,255,255,0.6)",
              fontFamily: "sans-serif",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <p style={{ fontSize: 18 }}>Something went wrong.</p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "10px 24px",
                borderRadius: 40,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "transparent",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Reload
            </button>
          </div>
        }
      >
        <Suspense fallback={null}>
          <Routes>
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/dashboard/*" element={<BusinessLayout />} />
            <Route path="/saved" element={<App />} />
            <Route path="/*" element={<App />} />
          </Routes>
        </Suspense>
      </Sentry.ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode>,
)
