import axios from 'axios'
import {
  applyStoredAccessToken,
  createRefreshResponseErrorHandler
} from './auth-session'

export type LoginRequestDTO = {
  email: string
  password: string
}

export type LoginResponseDTO = {
  accessToken: string
}

export type GetMeResponseDTO = {
  email: string
  role: string
}

export const authApi = axios.create({
  baseURL: import.meta.env.VITE_AUTH_API_URL ?? 'http://localhost:1000/api',
  timeout: 15000,
  withCredentials: true
})

authApi.interceptors.request.use(applyStoredAccessToken)
authApi.interceptors.response.use(
  (response) => response,
  createRefreshResponseErrorHandler(authApi)
)


export async function loginRequest(
  request: LoginRequestDTO
): Promise<LoginResponseDTO> {
  const { data } = await authApi.post<LoginResponseDTO>('/auth/login', request)
  return data
}

export async function logoutRequest(): Promise<void> {
  await authApi.post('/auth/logout')
}

export async function getMeRequest(): Promise<GetMeResponseDTO> {
  const { data } = await authApi.get<GetMeResponseDTO>('/auth/me')

  return data
}