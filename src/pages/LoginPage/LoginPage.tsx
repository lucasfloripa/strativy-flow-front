import {
  type FocusEvent,
  type FormEvent,
  useEffect,
  useRef,
  useState
} from 'react'

import { Link, useNavigate } from 'react-router-dom'

import { interactionTheme } from '../../app/theme/brandTheme'
import { useViewportBreakpoint } from '../../app/theme/useViewportBreakpoint'
import { useLoginForm } from '../../features/auth/hooks/useLoginForm'

export default function LoginPage() {
  const { isMobile } = useViewportBreakpoint()
  const navigate = useNavigate()
  const [isEmailFocused, setIsEmailFocused] = useState<boolean>(false)
  const [isPasswordFocused, setIsPasswordFocused] = useState<boolean>(false)
  const [isSubmitHovered, setIsSubmitHovered] = useState<boolean>(false)
  const scrollPositionBeforeFocusRef = useRef<number>(0)
  const restoreScrollTimeoutRef = useRef<number | null>(null)
  const { email, password, error, isSubmitting, setEmail, setPassword, submit } =
    useLoginForm()

  useEffect(() => {
    return () => {
      if (restoreScrollTimeoutRef.current !== null) {
        window.clearTimeout(restoreScrollTimeoutRef.current)
      }
    }
  }, [])

  const isLoginInput = (target: EventTarget | null): boolean =>
    target instanceof HTMLInputElement &&
    (target.id === 'email' || target.id === 'password')

  const handleInputFocus = (event: FocusEvent<HTMLInputElement>) => {
    if (restoreScrollTimeoutRef.current !== null) {
      window.clearTimeout(restoreScrollTimeoutRef.current)
      restoreScrollTimeoutRef.current = null
    }

    if (!isLoginInput(event.relatedTarget)) {
      scrollPositionBeforeFocusRef.current = window.scrollY
    }

    if (event.currentTarget.id === 'email') {
      setIsEmailFocused(true)
    } else {
      setIsPasswordFocused(true)
    }
  }

  const handleInputBlur = (event: FocusEvent<HTMLInputElement>) => {
    if (event.currentTarget.id === 'email') {
      setIsEmailFocused(false)
    } else {
      setIsPasswordFocused(false)
    }

    restoreScrollTimeoutRef.current = window.setTimeout(() => {
      if (!isLoginInput(document.activeElement)) {
        window.scrollTo(0, scrollPositionBeforeFocusRef.current)
      }

      restoreScrollTimeoutRef.current = null
    }, 450)
  }

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
        minHeight: isMobile ? '100svh' : '100vh',
        height: isMobile ? '100svh' : undefined,
        display: 'grid',
        gridTemplateColumns: isMobile
          ? 'minmax(0, 1fr)'
          : '40% 60%',
        columnGap: 0,
        placeItems: isMobile ? 'center' : undefined,
        padding: isMobile ? 24 : 0,
        overflowY: isMobile ? 'auto' : undefined,
        overscrollBehavior: isMobile ? 'none' : undefined,
        WebkitOverflowScrolling: isMobile ? 'touch' : undefined,
        background: isMobile
          ? '#f3f4f6'
          : 'linear-gradient(to bottom, #D8EBDD 0%, #EEF7F0 100%)',
        boxSizing: 'border-box'
      }}
    >
      <section
        style={{
          width: '100%',
          maxWidth: 'none',
          height: isMobile ? '100%' : '100vh',
          minHeight: 0,
          display: 'grid',
          placeItems: isMobile ? 'center' : 'stretch',
          padding: 0,
          background: '#f3f4f6',
          borderRadius: isMobile ? 12 : '12px 0 0 12px',
          overflow: 'hidden',
          boxShadow: isMobile ? 'none' : '-2px 0 4px -2px rgba(16, 24, 40, 0.04)',
          boxSizing: 'border-box',
          margin: isMobile ? 0 : 'auto'
        }}
      >
        <form
          onSubmit={handleSubmit}
          style={{
            width: '100%',
            maxWidth: isMobile ? 360 : 'none',
            height: isMobile ? 'auto' : '100%',
            justifySelf: 'center',
            alignSelf: 'center',
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 360px)',
            justifyContent: 'center',
            alignContent: isMobile ? 'normal' : 'center',
            gap: 16,
            padding: 24,
            borderRadius: isMobile ? 12 : '12px 0 0 12px',
            background: '#f3f4f6',
            boxShadow: isMobile ? 'none' : '-2px 0 4px -2px rgba(16, 24, 40, 0.04)',
            position: 'relative',
            boxSizing: 'border-box'
          }}
        >
          <div style={{ display: 'grid', gap: 6, textAlign: 'center' }}>
            <h1 style={{ margin: 0, color: '#374151', fontSize: 28, fontWeight: 700, lineHeight: 1.2, fontFamily: 'Canela, serif', fontStyle: 'italic' }}>
              Entre no{' '}
              <span>Flow</span>
            </h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: 13, lineHeight: 1.4 }}>
              Bem-vindo ao{' '}
              <span style={{ fontFamily: 'Canela, serif', fontStyle: 'italic', fontWeight: 500, fontSize: 15 }}>StrativyFlow</span>! Entre com suas credenciais para continuar.
            </p>
          </div>

          <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder="E-mail"
              autoComplete="email"
              style={{
                width: '100%',
                height: 42,
                borderRadius: 10,
                border: `1px solid ${isEmailFocused ? interactionTheme.inputFocusBorderColor : '#d7dce4'}`,
                padding: '0 14px',
                color: '#111827',
                background: '#ffffff',
                outline: 'none',
                fontSize: isMobile ? 16 : 14,
                boxSizing: 'border-box',
                boxShadow: isEmailFocused ? interactionTheme.inputFocusBoxShadow : 'none'
              }}
          />

          <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder="Senha"
              autoComplete="current-password"
              style={{
                width: '100%',
                height: 42,
                borderRadius: 10,
                border: `1px solid ${isPasswordFocused ? interactionTheme.inputFocusBorderColor : '#d7dce4'}`,
                padding: '0 14px',
                color: '#111827',
                background: '#ffffff',
                outline: 'none',
                fontSize: isMobile ? 16 : 14,
                boxSizing: 'border-box',
                boxShadow: isPasswordFocused ? interactionTheme.inputFocusBoxShadow : 'none'
              }}
          />

          <p style={{ margin: '-4px 0 0', color: '#64748b', fontSize: 12, lineHeight: 1.5 }}>
            Esqueceu sua Senha ?
          </p>

          {error ? (
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
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
            height: 42,
            border: 'none',
            borderRadius: 8,
            background: isSubmitHovered
              ? interactionTheme.primaryButtonHoverBackground
              : interactionTheme.primaryButtonBackground,
            color: '#ffffff',
            fontSize: 14,
            fontWeight: 700,
            cursor: isSubmitting ? 'not-allowed' : 'pointer'
          }}
          >
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>

          <p
            style={{
              position: isMobile ? 'static' : 'absolute',
              left: isMobile ? undefined : '50%',
              bottom: isMobile ? undefined : 24,
              width: isMobile ? 'auto' : 'min(360px, calc(100% - 48px))',
              transform: isMobile ? undefined : 'translateX(-50%)',
              margin: 0,
              fontSize: 12,
              textAlign: 'center'
            }}
          >
            Ao continuar, voce concorda com a nossa{' '}
            <Link to="/privacy-policy">Politica de Privacidade</Link>.
          </p>
        </form>
      </section>

      {!isMobile ? (
        <img
          src="/login.png"
          alt="Visão geral do Strativy Flow"
          style={{
            width: '100%',
            height: isMobile ? 'auto' : '100vh',
            display: 'block',
            objectFit: 'cover',
            objectPosition: 'center',
            borderRadius: isMobile ? 12 : '0 12px 12px 0',
            boxShadow: isMobile ? '0 1px 2px rgba(16, 24, 40, 0.04)' : '2px 0 4px -2px rgba(16, 24, 40, 0.04)',
            boxSizing: 'border-box'
          }}
        />
      ) : null}
    </main>
  )
}