export type LoginRequest = {
  email: string
  password: string
}

export type LoginResponse = {
  accessToken: string
}

export type ForgetPasswordRequest = {
  email: string
}

export type ForgetPasswordResponse = {
  message: string
}

export type ResetPasswordRequest = {
  token: string
  newPassword: string
  confirmPassword: string
}

export type ResetPasswordResponse = {
  message: string
}

export type MeResponse = {
  email: string
  role: string
}
