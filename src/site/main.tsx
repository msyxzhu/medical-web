import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from '../shared/ui.tsx'
import { SiteApp } from './App.tsx'
import '../shared/base.css'
import './site.css'

const root = document.getElementById('root')
if (!root) throw new Error('Missing application root')
createRoot(root).render(<StrictMode><ErrorBoundary><SiteApp /></ErrorBoundary></StrictMode>)
