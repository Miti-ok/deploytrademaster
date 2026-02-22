import { Routes, Route, Navigate, useLocation, useNavigate, Link } from 'react-router-dom'
import { useEffect, useMemo } from 'react'
import { useAnalysis } from './hooks/useAnalysis.js'
import ThemeToggle from './components/ThemeToggle.jsx'
import Intro from './pages/Intro.jsx'
import Home from './pages/Home.jsx'
import NewAnalysisChoice from './pages/NewAnalysisChoice.jsx'
import NewAnalysis from './pages/NewAnalysis.jsx'
import ProductImageAnalyzer from './pages/ProductImageAnalyzer.jsx'
import Results from './pages/Results.jsx'
import SavedAnalysis from './pages/SavedAnalysis.jsx'
import Settings from './pages/Settings.jsx'
import HowToUse from './pages/HowToUse.jsx'
import About from './pages/About.jsx'

const Shell = ({ children, hideHeader, pageTitle, showNewAnalysis, onBack }) => (
  <div className="min-h-screen px-4 pb-12 pt-10 sm:px-8">
    {!hideHeader && (
      <header className="mx-auto flex w-full max-w-6xl items-start justify-between gap-8">
        <div>
          <p className="label">TradeMaster Console</p>
          <h1 className="font-display text-2xl md:text-3xl text-[color:var(--text)]">
            Global Trade Intelligence
          </h1>
        </div>
        <div className="header-actions">
          <div className="header-meta">
            <button className="header-back" type="button" onClick={onBack}>
              Go back
            </button>
            {pageTitle && <span className="page-name">{pageTitle}</span>}
            {showNewAnalysis && <span className="meta-link">New analysis</span>}
            <Link className="meta-link meta-link-button" to="/about">
              About us
            </Link>
          </div>
          <div className="header-controls">
            <ThemeToggle />
          </div>
        </div>
      </header>
    )}
    <main className={`mx-auto w-full max-w-6xl ${hideHeader ? 'mt-0' : 'mt-10'}`}>{children}</main>
  </div>
)

export default function App() {
  const { analysis } = useAnalysis()
  const location = useLocation()
  const navigate = useNavigate()
  const hideHeader = location.pathname === '/'
  const pageTitle = useMemo(() => {
    const titles = {
      '/home': 'Home',
      '/new': '',
      '/analysis': 'Product details',
      '/image-analyzer': 'Image analyzer',
      '/results': 'Results',
      '/saved': 'Saved analysis',
      '/settings': 'Settings',
      '/how-to': 'How to use',
      '/about': 'About us'
    }
    return titles[location.pathname] ?? 'Global Trade Intelligence'
  }, [location.pathname])
  const showNewAnalysis = location.pathname === '/new'

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate(location.pathname === '/home' ? '/' : '/home')
  }

  useEffect(() => {
    const stored = window.localStorage.getItem('theme') || 'dark'
    document.documentElement.dataset.theme = stored
  }, [])

  return (
    <Shell
      hideHeader={hideHeader}
      pageTitle={pageTitle}
      showNewAnalysis={showNewAnalysis}
      onBack={handleBack}
    >
      <Routes>
        <Route path="/" element={<Intro />} />
        <Route path="/home" element={<Home />} />
        <Route path="/new" element={<NewAnalysisChoice />} />
        <Route path="/analysis" element={<NewAnalysis />} />
        <Route path="/image-analyzer" element={<ProductImageAnalyzer />} />
        <Route path="/results" element={<Results />} />
        <Route path="/saved" element={<SavedAnalysis />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/how-to" element={<HowToUse />} />
        <Route path="/about" element={<About />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  )
}
