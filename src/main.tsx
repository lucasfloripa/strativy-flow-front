import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

import BoardPage from './pages/BoardPage'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import LoginPage from './pages/LoginPage'

export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  if (localStorage.getItem('accessToken')) {
    return <Navigate to="/board" replace />
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
      <Route path="/" element={<Navigate to="/board" replace />} />
      <Route path="/board" element={<BoardPage />} />
      <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
      <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
    </Routes>
  </BrowserRouter>,
)