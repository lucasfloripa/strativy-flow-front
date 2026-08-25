import { authApiClient } from '../../../core/api/authApiClient'
import type {
  LoginRequest,
  LoginResponse,
  MeResponse,
  ForgetPasswordRequest,
  ForgetPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse
} from '../types/auth.types'

export const AuthService = {
  async login(request: LoginRequest): Promise<LoginResponse> {
    const { data } = await authApiClient.post<LoginResponse>('/auth/login', request)
    return data
  },

  async forgetPassword(
    request: ForgetPasswordRequest
  ): Promise<ForgetPasswordResponse> {
    const { data } = await authApiClient.post<ForgetPasswordResponse>(
      '/users/forget-password',
      request
    )
    return data
  },

  async resetPassword(
    request: ResetPasswordRequest
  ): Promise<ResetPasswordResponse> {
    const { data } = await authApiClient.post<ResetPasswordResponse>(
      '/users/reset-password',
      request
    )
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
