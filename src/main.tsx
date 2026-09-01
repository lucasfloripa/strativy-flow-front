import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import './app/global.css'
import { AuthenticatedLayout } from './app/layouts/AuthenticatedLayout'
import HomePage from './pages/HomePage'
import LeadsPage from './pages/LeadsPage'
import LeadsArquivadosPage from './pages/LeadsArquivadosPage'
import NegociosPage from './pages/NegociosPage'
import ConversasPage from './pages/ConversasPage'
import ArquivosPage from './pages/ArquivosPage'
import FinanceiroPage from './pages/FinanceiroPage'
import MetricasPage from './pages/MetricasPage'
import AgendaPage from './pages/AgendaPage'
import ContatosPage from './pages/ContatosPage'
import InformacoesPage from './pages/InformacoesPage'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import LoginPage from './pages/LoginPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import ForgetPasswordPage from './pages/ForgetPasswordPage'

const setupIosSafariBrowserMode = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return
  }

  const userAgent = navigator.userAgent
  const isIosDevice = /iPhone|iPad|iPod/i.test(userAgent)
  const isSafariBrowser =
    /Safari/i.test(userAgent) && !/CriOS|FxiOS|EdgiOS/i.test(userAgent)
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true

  if (!isIosDevice || !isSafariBrowser) {
    return
  }

  if (!isStandalone) {
    document.documentElement.classList.add('ios-safari-browser')
  }

  if (isStandalone) {
    return
  }

  const hasFocusedLoginInput = () =>
    window.location.pathname === '/login' &&
    document.activeElement instanceof HTMLInputElement

  const nudgeToolbar = () => {
    window.requestAnimationFrame(() => {
      if (hasFocusedLoginInput()) {
        return
      }

      window.scrollTo(0, 1)
      window.setTimeout(() => {
        if (hasFocusedLoginInput()) {
          return
        }

        window.scrollTo(0, 1)
      }, 120)
    })
  }

  window.addEventListener('load', nudgeToolbar)
  window.addEventListener('orientationchange', nudgeToolbar)
  window.addEventListener('resize', nudgeToolbar)
  window.addEventListener('touchend', nudgeToolbar, { passive: true })

  window.setTimeout(nudgeToolbar, 250)
}

setupIosSafariBrowserMode()

export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  if (localStorage.getItem('accessToken')) {
    return <Navigate to="/inicio" replace />
  }
  return <>{children}</>
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Navigate to="/inicio" replace />} />
      <Route path="/home" element={<Navigate to="/inicio" replace />} />
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />
      <Route path="/forget-password" element={<ForgetPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
      <Route element={<AuthenticatedLayout />}>
        <Route path="/inicio" element={<HomePage />} />
        <Route path="/leads" element={<LeadsPage />} />
        <Route path="/leads/:leadId" element={<LeadsPage />} />
        <Route path="/negocios" element={<NegociosPage />} />
        <Route path="/negocios/new" element={<NegociosPage />} />
        <Route path="/negocios/:leadId" element={<NegociosPage />} />
        <Route path="/conversas" element={<ConversasPage />} />
        <Route path="/conversas/:leadId" element={<ConversasPage />} />
        <Route path="/arquivos" element={<ArquivosPage />} />
        <Route path="/arquivos/:leadId" element={<ArquivosPage />} />
        <Route path="/financeiro" element={<FinanceiroPage />} />
        <Route path="/metricas" element={<MetricasPage />} />
        <Route path="/agenda" element={<AgendaPage />} />
        <Route path="/agenda/:leadId" element={<AgendaPage />} />
        <Route path="/contatos" element={<ContatosPage />} />
        <Route path="/contatos/:contactId" element={<ContatosPage />} />
        <Route path="/arquivados" element={<LeadsArquivadosPage />} />
        <Route path="/arquivados/:leadId" element={<LeadsArquivadosPage />} />
        <Route path="/informacoes" element={<InformacoesPage />} />
      </Route>
    </Routes>
  </BrowserRouter>,
)
