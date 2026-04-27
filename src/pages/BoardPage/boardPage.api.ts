import axios from 'axios'
import {
  applyStoredAccessToken,
  createRefreshResponseErrorHandler
} from '../LoginPage/auth-session'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000',
  timeout: 15000,
  withCredentials: true
})

api.interceptors.request.use((config) => {
  return applyStoredAccessToken(config)
})

api.interceptors.response.use(
  (response) => response,
  createRefreshResponseErrorHandler(api)
)
