
import { useState } from 'react'
import type { FormEvent } from 'react'
import axios from 'axios'
import { useAtom, useSetAtom } from 'jotai'
import { useNavigate } from 'react-router-dom'

import { loginRequest } from './loginPage.api'
import { accessTokenAtom, isLoginSubmittingAtom, loginErrorAtom } from './loginPage.store'
import * as Styles from './loginPage.styles'

function getLoginErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : 'Nao foi possivel entrar.'
  }

  const responseMessage = error.response?.data?.message

  if (Array.isArray(responseMessage) && responseMessage.length > 0) {
    return String(responseMessage[0])
  }

  if (typeof responseMessage === 'string' && responseMessage.trim()) {
    return responseMessage
  }

  if (typeof error.message === 'string' && error.message.trim()) {
    return error.message
  }

  return 'Nao foi possivel entrar.'
}

export default function LoginPage() {
  const navigate = useNavigate()
  const setAccessToken = useSetAtom(accessTokenAtom)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useAtom(isLoginSubmittingAtom)
  const [error, setError] = useAtom(loginErrorAtom)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!email.trim() || !password.trim()) {
      setError('Preencha email e senha para continuar.')
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      const response = await loginRequest({
        email: email.trim(),
        password
      })

      localStorage.setItem('accessToken', response.accessToken)
      setAccessToken(response.accessToken)

      navigate('/board')
    } catch (e: unknown) {
      const message = getLoginErrorMessage(e)
      setAccessToken(null)
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Styles.GlobalStyle />

      <Styles.Container>
        <Styles.BackgroundImage src="/fundo01.png" alt="" />
        <Styles.Overlay />

        <Styles.Content>
          <Styles.FormCard>
            <Styles.Title>Bem-vindo ao Flow</Styles.Title>

            <Styles.Form onSubmit={handleSubmit}>
              <Styles.Field>
                <Styles.Label htmlFor="email">Email</Styles.Label>
                <Styles.Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="seuemail@empresa.com"
                  autoComplete="email"
                />
              </Styles.Field>

              <Styles.Field>
                <Styles.Label htmlFor="password">Senha</Styles.Label>
                <Styles.Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="********"
                  autoComplete="current-password"
                />
              </Styles.Field>

              {error ? <Styles.ErrorMessage>{error}</Styles.ErrorMessage> : null}

              <Styles.SubmitButton type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Entrando...' : 'Entrar'}
              </Styles.SubmitButton>
            </Styles.Form>

            <Styles.FooterRow>
              <Styles.FooterText>
                Ao continuar, voce concorda com a nossa <Styles.FooterLink to="/privacy-policy">Politica de Privacidade</Styles.FooterLink>.
              </Styles.FooterText>
            </Styles.FooterRow>
          </Styles.FormCard>
        </Styles.Content>
      </Styles.Container>
    </>
  )
}