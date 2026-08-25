import { useState } from 'react'
import axios from 'axios'

import { AuthService } from '../services/AuthService'

type UseResetPasswordFormResult = {
  newPassword: string
  confirmPassword: string
  isSubmitting: boolean
  error: string | null
  setNewPassword: (value: string) => void
  setConfirmPassword: (value: string) => void
  submit: () => Promise<string | null>
}

const getResetPasswordErrorMessage = (error: unknown): string => {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error
      ? error.message
      : 'Não foi possível redefinir sua senha.'
  }

  const responseMessage = error.response?.data?.message

  if (typeof responseMessage === 'string' && responseMessage.trim()) {
    return responseMessage
  }

  return 'Não foi possível redefinir sua senha.'
}

export function useResetPasswordForm(
  token: string | null
): UseResetPasswordFormResult {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (): Promise<string | null> => {
    if (!token) {
      setError('Link de redefinição inválido.')
      return null
    }

    if (!newPassword || !confirmPassword) {
      setError('Preencha e confirme a nova senha.')
      return null
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.')
      return null
    }

    try {
      setIsSubmitting(true)
      setError(null)

      const response = await AuthService.resetPassword({
        token,
        newPassword,
        confirmPassword
      })

      return response.message
    } catch (exception: unknown) {
      setError(getResetPasswordErrorMessage(exception))
      return null
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    newPassword,
    confirmPassword,
    isSubmitting,
    error,
    setNewPassword,
    setConfirmPassword,
    submit
  }
}