import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from '../shared/ui.tsx'
import { AdminApp } from './App.tsx'
import '../shared/base.css'
import './admin.css'

const root = document.getElementById('root')
if (!root) throw new Error('Missing application root')
createRoot(root).render(<StrictMode><ErrorBoundary><AdminApp /></ErrorBoundary></StrictMode>)
