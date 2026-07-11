export type LoginRequest = {
  email: string
  password: string
}

export type LoginResponse = {
  accessToken: string
}

export type MeResponse = {
  email: string
  role: string
}
