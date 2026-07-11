import { type FormEvent, useState } from 'react'

import { Link, useNavigate } from 'react-router-dom'

import { interactionTheme } from '../../app/theme/brandTheme'
import { useLoginForm } from '../../features/auth/hooks/useLoginForm'

export default function LoginPage() {
  const navigate = useNavigate()
  const [isEmailFocused, setIsEmailFocused] = useState<boolean>(false)
  const [isPasswordFocused, setIsPasswordFocused] = useState<boolean>(false)
  const [isSubmitHovered, setIsSubmitHovered] = useState<boolean>(false)
  const { email, password, error, isSubmitting, setEmail, setPassword, submit } =
    useLoginForm()

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const success = await submit()

    if (success) {
      navigate('/inicio')
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        background: '#163d2e'
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: 360,
          display: 'grid',
          gap: 12,
          padding: 24,
          borderRadius: 12,
          background: '#ffffff'
        }}
      >
        <h1 style={{ margin: 0, fontSize: 24 }}>Entrar</h1>

        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          onFocus={() => setIsEmailFocused(true)}
          onBlur={() => setIsEmailFocused(false)}
          placeholder="seuemail@empresa.com"
          autoComplete="email"
          style={{
            height: 40,
            borderRadius: 8,
            border: `1px solid ${
              isEmailFocused
                ? interactionTheme.inputFocusBorderColor
                : '#d1d5db'
            }`,
            padding: '0 12px',
            outline: 'none',
            boxShadow: isEmailFocused
              ? interactionTheme.inputFocusBoxShadow
              : 'none'
          }}
        />

        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          onFocus={() => setIsPasswordFocused(true)}
          onBlur={() => setIsPasswordFocused(false)}
          placeholder="********"
          autoComplete="current-password"
          style={{
            height: 40,
            borderRadius: 8,
            border: `1px solid ${
              isPasswordFocused
                ? interactionTheme.inputFocusBorderColor
                : '#d1d5db'
            }`,
            padding: '0 12px',
            outline: 'none',
            boxShadow: isPasswordFocused
              ? interactionTheme.inputFocusBoxShadow
              : 'none'
          }}
        />

        {error ? (
          <div
            style={{
              fontSize: 12,
              color: '#b91c1c'
            }}
          >
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          onMouseEnter={() => setIsSubmitHovered(true)}
          onMouseLeave={() => setIsSubmitHovered(false)}
          style={{
            height: 40,
            border: 'none',
            borderRadius: 8,
            background: isSubmitHovered
              ? interactionTheme.primaryButtonHoverBackground
              : interactionTheme.primaryButtonBackground,
            color: '#ffffff',
            fontWeight: 600,
            cursor: isSubmitting ? 'not-allowed' : 'pointer'
          }}
        >
          {isSubmitting ? 'Entrando...' : 'Entrar'}
        </button>

        <p style={{ margin: 0, fontSize: 12 }}>
          Ao continuar, voce concorda com a nossa{' '}
          <Link to="/privacy-policy">Politica de Privacidade</Link>.
        </p>
      </form>
    </main>
  )
}