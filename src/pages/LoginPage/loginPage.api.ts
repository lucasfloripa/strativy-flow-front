import axios from 'axios'

export type LoginRequestDTO = {
  email: string
  password: string
}

export type LoginResponseDTO = {
  accessToken: string
}

export const authApi = axios.create({
  baseURL: import.meta.env.VITE_AUTH_API_URL ?? 'http://localhost:1000/api',
  timeout: 15000,
  withCredentials: true
})

export async function loginRequest(
  request: LoginRequestDTO
): Promise<LoginResponseDTO> {
  const { data } = await authApi.post<LoginResponseDTO>('/auth/login', request)
  return data
}