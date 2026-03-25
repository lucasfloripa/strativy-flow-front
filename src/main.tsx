import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

import BoardPage from './pages/BoardPage'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import LoginPage from './pages/LoginPage'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
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
        <Route path="/login" element={<LoginPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)