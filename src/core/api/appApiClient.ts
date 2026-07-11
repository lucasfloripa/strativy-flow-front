import axios from 'axios'

import {
  applyStoredAccessToken,
  createRefreshResponseErrorHandler
} from '../../pages/LoginPage/auth-session'

export const appApiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000',
  timeout: 15000,
  withCredentials: true
})

appApiClient.interceptors.request.use((config) => {
  return applyStoredAccessToken(config)
})

appApiClient.interceptors.response.use(
  (response) => response,
  createRefreshResponseErrorHandler(appApiClient)
)
