import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import BoardPage from './pages/BoardPage'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import LoginPage from './pages/LoginPage'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/board" replace />} />
        <Route path="/board" element={<BoardPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)