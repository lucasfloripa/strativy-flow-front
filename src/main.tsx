import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

import './app/global.css'
import { AuthenticatedLayout } from './app/layouts/AuthenticatedLayout'
import HomePage from './pages/HomePage'
import LeadsPage from './pages/LeadsPage'
import LeadsArquivadosPage from './pages/LeadsArquivadosPage'
import NegociosPage from './pages/NegociosPage'
import ArquivosPage from './pages/ArquivosPage'
import AgendaPage from './pages/AgendaPage'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import LoginPage from './pages/LoginPage'

const setupIosSafariToolbarFallback = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return
  }

  const userAgent = navigator.userAgent
  const isIosDevice = /iPhone|iPad|iPod/i.test(userAgent)
  const isSafariBrowser = /Safari/i.test(userAgent) && !/CriOS|FxiOS|EdgiOS/i.test(userAgent)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true

  if (!isIosDevice || !isSafariBrowser || isStandalone) {
    return
  }

  const nudgeToolbar = () => {
    window.requestAnimationFrame(() => {
      window.scrollTo(0, 1)
    })
  }

  window.addEventListener('load', nudgeToolbar)
  window.addEventListener('orientationchange', nudgeToolbar)
  window.addEventListener('touchend', nudgeToolbar, { passive: true })
}

setupIosSafariToolbarFallback()

export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  if (localStorage.getItem('accessToken')) {
    return <Navigate to="/inicio" replace />
  }
  return <>{children}</>
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3500,
        success: {
          style: {
            background: '#16a34a',
            color: '#ffffff'
          }
        },
        error: {
          style: {
            background: '#dc2626',
            color: '#ffffff'
          }
        }
      }}
    />
    <Routes>
      <Route path="/" element={<Navigate to="/inicio" replace />} />
      <Route path="/home" element={<Navigate to="/inicio" replace />} />
      <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
      <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
      <Route element={<AuthenticatedLayout />}>
        <Route path="/inicio" element={<HomePage />} />
        <Route path="/leads" element={<LeadsPage />} />
        <Route path="/leads/:leadId" element={<LeadsPage />} />
        <Route path="/negocios" element={<NegociosPage />} />
        <Route path="/negocios/new" element={<NegociosPage />} />
        <Route path="/negocios/:leadId" element={<NegociosPage />} />
        <Route path="/arquivos" element={<ArquivosPage />} />
        <Route path="/agenda" element={<AgendaPage />} />
        <Route path="/agenda/:leadId" element={<AgendaPage />} />
        <Route path="/arquivados" element={<LeadsArquivadosPage />} />
        <Route path="/arquivados/:leadId" element={<LeadsArquivadosPage />} />
      </Route>
    </Routes>
  </BrowserRouter>,
)