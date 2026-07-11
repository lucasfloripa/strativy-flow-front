import axios from 'axios'

import {
  applyStoredAccessToken,
  createRefreshResponseErrorHandler
} from '../../pages/LoginPage/auth-session'

export const authApiClient = axios.create({
  baseURL: import.meta.env.VITE_AUTH_API_URL ?? 'http://localhost:1000/api',
  timeout: 15000,
  withCredentials: true
})

authApiClient.interceptors.request.use(applyStoredAccessToken)
authApiClient.interceptors.response.use(
  (response) => response,
  createRefreshResponseErrorHandler(authApiClient)
)
