import { authApiClient } from '../../../core/api/authApiClient'
import type { LoginRequest, LoginResponse, MeResponse } from '../types/auth.types'

export const AuthService = {
  async login(request: LoginRequest): Promise<LoginResponse> {
    const { data } = await authApiClient.post<LoginResponse>('/auth/login', request)
    return data
  },

  async logout(): Promise<void> {
    await authApiClient.post('/auth/logout')
  },

  async getMe(): Promise<MeResponse> {
    const { data } = await authApiClient.get<MeResponse>('/auth/me')
    return data
  }
}
