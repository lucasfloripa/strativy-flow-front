
import { useState } from 'react'
import type { FormEvent } from 'react'
import axios from 'axios'
import { Link, useNavigate } from 'react-router-dom'
import styled, { createGlobalStyle } from 'styled-components'

const authApi = axios.create({
  baseURL: import.meta.env.VITE_AUTH_API_URL ?? 'http://localhost:1000/api'
})

export default function LoginPage() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!email.trim() || !password.trim()) {
      setError('Preencha email e senha para continuar.')
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)

      await authApi.post('/auth/login', {
        email: email.trim(),
        password
      })

      navigate('/board')
    } catch (e: unknown) {
      const message = axios.isAxiosError(e)
        ? e.response?.data?.message ?? e.message
        : e instanceof Error
          ? e.message
          : 'Nao foi possivel entrar.'
      setError(String(message))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <GlobalStyle />

      <Page>
        <LeftPanel>
          <LeftTopBrand>
            <LeftTopBrandDot />
            <LeftTopBrandText>Strativy.co</LeftTopBrandText>
          </LeftTopBrand>

          <LoginContent>
            <Title>Login</Title>

            <Form onSubmit={handleSubmit}>
              <Field>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="seuemail@empresa.com"
                  autoComplete="email"
                />
              </Field>

              <Field>
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="********"
                  autoComplete="current-password"
                />
              </Field>

              {error ? <ErrorMessage>{error}</ErrorMessage> : null}

              <SubmitButton type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Entrando...' : 'Entrar'}
              </SubmitButton>
            </Form>

            <FooterRow>
              <FooterText>
                Ao continuar, voce concorda com a nossa <FooterLink to="/privacy-policy">Politica de Privacidade</FooterLink>.
              </FooterText>
            </FooterRow>
          </LoginContent>
        </LeftPanel>

        <RightPanel>
          <BackgroundGlowTop />
          <BackgroundGlowBottom />
          <RightBrandBlock>
            <RightBrand>Strativy Flow</RightBrand>
            <RightSubtitle>
              Seus leads em um único fluxo.
            </RightSubtitle>
          </RightBrandBlock>
        </RightPanel>
      </Page>
    </>
  )
}

const GlobalStyle = createGlobalStyle`
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,600&display=swap');

  :root {
    color-scheme: light;
  }

  * {
    box-sizing: border-box;
  }

  html, body, #root {
    height: 100%;
  }

  body {
    margin: 0;
    background: #f4f5f7;
    color: #111111;
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
  }
`

const Page = styled.div`
  min-height: 100vh;
  display: flex;
  width: 100%;
  position: relative;
  overflow: hidden;

  @media (max-width: 900px) {
    flex-direction: column;
  }
`

const LeftPanel = styled.section`
  width: 40%;
  min-height: 100vh;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  position: relative;
  z-index: 1;

  @media (max-width: 900px) {
    width: 100%;
    min-height: 100vh;
    padding: 28px;
  }
`

const LeftTopBrand = styled.div`
  position: absolute;
  top: 24px;
  left: 24px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
`

const LeftTopBrandDot = styled.span`
  width: 11px;
  height: 11px;
  border-radius: 999px;
  background: #000000;
`

const LeftTopBrandText = styled.span`
  color: #111111;
  font-size: 20px;
  font-weight: 700;
  line-height: 1;
`

const RightPanel = styled.section`
  width: 60%;
  min-height: 100vh;
  background: #f4f5f7;
  position: relative;
  overflow: hidden;

  @media (max-width: 900px) {
    display: none;
  }
`

const RightBrandBlock = styled.div`
  position: absolute;
  top: 44%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  z-index: 1;
  width: min(84%, 680px);
`

const RightBrand = styled.h2`
  margin: 0;
  color: #000000;
  font-family: 'Cormorant Garamond', Garamond, 'Times New Roman', serif;
  font-size: clamp(44px, 6.2vw, 86px);
  font-style: italic;
  font-weight: 600;
  letter-spacing: 0.4px;
  line-height: 1;
`

const RightSubtitle = styled.p`
  margin: 14px 0 0;
  color: #1f2937;
  font-size: clamp(13px, 1.25vw, 17px);
  line-height: 1.5;
`

const BackgroundGlowTop = styled.div`
  position: absolute;
  top: -240px;
  right: -120px;
  width: 520px;
  height: 520px;
  border-radius: 999px;
  background: radial-gradient(circle at center, rgba(217, 205, 176, 0.48) 0%, rgba(217, 205, 176, 0) 70%);
  pointer-events: none;
`

const BackgroundGlowBottom = styled.div`
  position: absolute;
  bottom: -240px;
  left: -120px;
  width: 520px;
  height: 520px;
  border-radius: 999px;
  background: radial-gradient(circle at center, rgba(47, 94, 62, 0.38) 0%, rgba(47, 94, 62, 0) 70%);
  pointer-events: none;
`

const LoginContent = styled.div`
  width: 100%;
  max-width: 460px;
  background: #ffffff;
  padding: 0;
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;

  @media (max-width: 640px) {
    max-width: 100%;
  }
`

const Title = styled.h1`
  margin: 0;
  font-size: 28px;
  line-height: 1.18;
  letter-spacing: -0.4px;
`

const Form = styled.form`
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
`

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;
`

const Label = styled.label`
  font-size: 13px;
  font-weight: 700;
  color: #1f2937;
`

const Input = styled.input`
  width: 100%;
  min-height: 44px;
  border: 1px solid #d6d6d6;
  border-radius: 11px;
  background: #ffffff;
  color: #111111;
  padding: 0 12px;
  outline: none;
  font-size: 14px;
  font-weight: 500;

  &:focus {
    border-color: #b7b7b7;
    box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.05);
  }
`

const ErrorMessage = styled.div`
  border: 1px solid #ffcfcf;
  background: #fff5f5;
  color: #8b1a1a;
  border-radius: 10px;
  padding: 10px 11px;
  font-size: 12px;
  font-weight: 700;
`

const SubmitButton = styled.button`
  width: 100%;
  min-height: 44px;
  border: 1px solid #111111;
  border-radius: 11px;
  background: #111111;
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s ease;

  &:hover {
    opacity: 0.88;
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`

const FooterRow = styled.div`
  margin-top: 16px;
`

const FooterText = styled.p`
  margin: 0;
  color: #6b7280;
  font-size: 12px;
  line-height: 1.5;
  text-align: center;
`

const FooterLink = styled(Link)`
  color: #111111;
  font-weight: 700;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`