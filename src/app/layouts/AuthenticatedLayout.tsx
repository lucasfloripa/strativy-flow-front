import { Archive, Briefcase, CalendarClock, Home, Lock, LogOut, Mail, MessageCircle, PanelLeft, Phone, Settings, Trash2, Users } from 'lucide-react'
import { useAtomValue, useSetAtom } from 'jotai'
import { useEffect, useState } from 'react'
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'

import { interactionTheme } from '../theme/brandTheme'
import { authUserEmailAtom } from '../../core/state/authUserEmailAtom'
import { appApiClient } from '../../core/api/appApiClient'
import { authApiClient } from '../../core/api/authApiClient'
import { AuthService } from '../../features/auth/services/AuthService'

type SettingsTab = 'usuario' | 'notificacoes'

type UserInformationsResponse = {
  id: string
  name?: string | null
  phoneNumber?: string | null
  notificationWhatsAppNumbers?: string[]
}

const formatPhoneNumber = (value: string): string => {
  const digits = value.replace(/\D/g, '')

  if (!digits) {
    return '-'
  }

  const normalizedDigits = digits.startsWith('55') && digits.length > 11 ? digits.slice(2) : digits
  const phoneMatch = normalizedDigits.match(/^(\d{2})(\d{4,5})(\d{4})$/)

  if (!phoneMatch) {
    return value.trim() || '-'
  }

  const [, ddd, firstPart, secondPart] = phoneMatch
  return `(${ddd}) ${firstPart}-${secondPart}`
}

const formatRoleLabel = (role?: string | null): string => {
  const normalizedRole = (role ?? '').trim().toLowerCase()

  if (!normalizedRole) {
    return '-'
  }

  if (normalizedRole === 'admin' || normalizedRole === 'administrator') {
    return 'Administrador'
  }

  if (normalizedRole === 'user') {
    return 'Usuário'
  }

  return normalizedRole.charAt(0).toUpperCase() + normalizedRole.slice(1)
}

const getFirstName = (value?: string | null): string => {
  const normalizedValue = (value ?? '').trim()

  if (!normalizedValue) {
    return ''
  }

  return normalizedValue.split(' ').filter(Boolean)[0] ?? ''
}

const navItemStyle = (
  isActive: boolean,
  isHovered: boolean,
  isSidebarCollapsed: boolean
) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: isSidebarCollapsed ? 'center' : 'flex-start',
  width: '100%',
  minHeight: 40,
  textAlign: 'left' as const,
  borderRadius: 8,
  border: '1px solid transparent',
  textDecoration: 'none',
  background:
    isActive || isHovered
      ? interactionTheme.sidebarItemActiveBackground
      : 'transparent',
  color:
    isActive || isHovered
      ? interactionTheme.sidebarItemActiveColor
      : interactionTheme.sidebarItemDefaultColor,
  padding: isSidebarCollapsed ? '10px 8px' : '10px 12px',
  fontSize: 14,
  fontWeight: 500,
  lineHeight: 1.2
})

const getGreetingLabel = (): string => {
  const currentHour = new Date().getHours()

  if (currentHour < 12) {
    return 'Bom dia'
  }

  if (currentHour < 18) {
    return 'Boa tarde'
  }

  return 'Boa noite'
}

const getUserFirstName = (email?: string | null): string => {
  const normalizedEmail = (email ?? '').trim()

  if (!normalizedEmail.includes('@')) {
    return 'Usuário'
  }

  const [emailPrefix] = normalizedEmail.split('@')
  const [firstToken] = emailPrefix.split(/[._-]/).filter(Boolean)

  if (!firstToken) {
    return 'Hayanne'
  }

  return `${firstToken.charAt(0).toUpperCase()}${firstToken.slice(1).toLowerCase()}`
}

const getUserIdFromStoredAccessToken = (): string | null => {
  const token = localStorage.getItem('accessToken')

  if (!token) {
    return null
  }

  try {
    const payload = token.split('.')[1]

    if (!payload) {
      return null
    }

    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decodedPayload = atob(normalizedPayload)
    const parsedPayload = JSON.parse(decodedPayload) as { userId?: unknown }

    return typeof parsedPayload.userId === 'string' ? parsedPayload.userId : null
  } catch {
    return null
  }
}

export function AuthenticatedLayout() {
  const sidebarBorder = `1px solid ${interactionTheme.sidebarItemActiveBackground}`
  const settingsPanelWidth = 'min(48vw, 760px)'
  const hasToken = Boolean(localStorage.getItem('accessToken'))
  const authUserEmail = useAtomValue(authUserEmailAtom)
  const setEmail = useSetAtom(authUserEmailAtom)
  const location = useLocation()
  const navigate = useNavigate()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false)
  const [hoveredNavKey, setHoveredNavKey] = useState<string | null>(null)
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState<boolean>(false)
  const [isSettingsPanelVisible, setIsSettingsPanelVisible] = useState<boolean>(false)
  const [selectedSettingsTab, setSelectedSettingsTab] = useState<SettingsTab>('usuario')
  const [hoveredSettingsTab, setHoveredSettingsTab] = useState<SettingsTab | null>(null)
  const [headerUserName, setHeaderUserName] = useState<string>('')
  const [settingsUserRole, setSettingsUserRole] = useState<string>('Administrador')
  const [settingsUserInformationId, setSettingsUserInformationId] = useState<string>('')
  const [settingsUserName, setSettingsUserName] = useState<string>('')
  const [settingsUserPhoneNumber, setSettingsUserPhoneNumber] = useState<string>('')
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false)
  const [currentPasswordInput, setCurrentPasswordInput] = useState<string>('')
  const [newPasswordInput, setNewPasswordInput] = useState<string>('')
  const [newPasswordConfirmationInput, setNewPasswordConfirmationInput] = useState<string>('')
  const [isUpdatingPassword, setIsUpdatingPassword] = useState<boolean>(false)
  const [passwordChangeFeedback, setPasswordChangeFeedback] = useState<string | null>(null)
  const [passwordChangeSucceeded, setPasswordChangeSucceeded] = useState<boolean>(false)
  const [notificationNumbers, setNotificationNumbers] = useState<string[]>([])
  const [notificationNumberInput, setNotificationNumberInput] = useState<string>('')
  const [isSavingNotificationNumbers, setIsSavingNotificationNumbers] = useState<boolean>(false)
  const [notificationNumbersFeedback, setNotificationNumbersFeedback] = useState<string | null>(null)
  const greetingLabel = getGreetingLabel()
  const userFirstName =
    getFirstName(headerUserName) || getFirstName(settingsUserName) || getUserFirstName(authUserEmail)

  useEffect(() => {
    if (!hasToken) {
      return
    }

    let isMounted = true

    const loadHeaderUserName = async () => {
      const { data } = await appApiClient.get<UserInformationsResponse[]>('/user/user-informations')

      if (!isMounted) {
        return
      }

      const firstAvailableName = data
        .map((item) => item.name?.trim() ?? '')
        .find((name) => Boolean(name))

      if (firstAvailableName) {
        setHeaderUserName(getFirstName(firstAvailableName))
      }
    }

    void loadHeaderUserName()

    return () => {
      isMounted = false
    }
  }, [hasToken])

  useEffect(() => {
    if (!hasToken) {
      return
    }

    let isMounted = true

    const loadAuthProfile = async () => {
      const profile = await AuthService.getMe()

      if (!isMounted) {
        return
      }

      setEmail(profile.email)
      setSettingsUserRole(formatRoleLabel(profile.role))
    }

    void loadAuthProfile()

    return () => {
      isMounted = false
    }
  }, [hasToken])

  useEffect(() => {
    if (!isSettingsPanelOpen) {
      setIsSettingsPanelVisible(false)
      return
    }

    setIsSettingsPanelVisible(false)
    const animationFrameId = window.requestAnimationFrame(() => {
      setIsSettingsPanelVisible(true)
    })

    return () => {
      window.cancelAnimationFrame(animationFrameId)
    }
  }, [isSettingsPanelOpen])

  useEffect(() => {
    if (!isSettingsPanelOpen) {
      return
    }

    let isMounted = true

    const loadUserInformations = async () => {
      const { data } = await appApiClient.get<UserInformationsResponse[]>('/user/user-informations')

      if (!isMounted) {
        return
      }

      const primaryUserInformation = data[0]
      setSettingsUserInformationId(primaryUserInformation?.id ?? '')
      setSettingsUserName(primaryUserInformation?.name?.trim() ?? '')
      setSettingsUserPhoneNumber(primaryUserInformation?.phoneNumber?.trim() ?? '')

      const uniqueNumbers = Array.from(
        new Set(
          data.flatMap((item) =>
            (item.notificationWhatsAppNumbers ?? [])
              .map((number) => number.trim())
              .filter((number) => Boolean(number))
          )
        )
      )

      setNotificationNumbers(uniqueNumbers)
      setNotificationNumbersFeedback(null)
    }

    void loadUserInformations()

    return () => {
      isMounted = false
    }
  }, [isSettingsPanelOpen])

  useEffect(() => {
    if (!passwordChangeSucceeded || passwordChangeFeedback !== 'Senha alterada com sucesso.') {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setPasswordChangeFeedback(null)
      setPasswordChangeSucceeded(false)
    }, 5000)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [passwordChangeFeedback, passwordChangeSucceeded])

  const usuarioTabIsActive = selectedSettingsTab === 'usuario'
  const notificacoesTabIsActive = selectedSettingsTab === 'notificacoes'

  const persistNotificationNumbers = async (nextNumbers: string[]) => {
    if (!settingsUserInformationId) {
      setNotificationNumbersFeedback('User informations não encontrado para salvar notificações.')
      return false
    }

    setIsSavingNotificationNumbers(true)
    setNotificationNumbersFeedback(null)

    try {
      await appApiClient.patch(
        `/user/user-informations/${settingsUserInformationId}/notifications`,
        {
          notificationWhatsAppNumbers: nextNumbers
        }
      )

      setNotificationNumbers(nextNumbers)
      setNotificationNumbersFeedback('Números de notificação salvos com sucesso.')
      return true
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Não foi possível salvar os números de notificação.'
      setNotificationNumbersFeedback(errorMessage)
      return false
    } finally {
      setIsSavingNotificationNumbers(false)
    }
  }

  const handleAddNotificationNumber = async () => {
    const normalizedNumber = notificationNumberInput.trim()

    if (!normalizedNumber) {
      setNotificationNumbersFeedback('Informe um número para adicionar.')
      return
    }

    if (notificationNumbers.includes(normalizedNumber)) {
      setNotificationNumbersFeedback('Esse número já está na lista.')
      return
    }

    const nextNumbers = [...notificationNumbers, normalizedNumber]
    const persisted = await persistNotificationNumbers(nextNumbers)

    if (persisted) {
      setNotificationNumberInput('')
    }
  }

  const handleRemoveNotificationNumber = async (numberToRemove: string) => {
    const nextNumbers = notificationNumbers.filter(
      (currentNumber) => currentNumber !== numberToRemove
    )

    await persistNotificationNumbers(nextNumbers)
  }

  const handleClearNotificationNumbers = async () => {
    await persistNotificationNumbers([])
  }

  const handleOpenChangePasswordForm = () => {
    setPasswordChangeFeedback(null)
    setPasswordChangeSucceeded(false)
    setIsChangingPassword(true)
  }

  const handleCancelPasswordChange = () => {
    setCurrentPasswordInput('')
    setNewPasswordInput('')
    setNewPasswordConfirmationInput('')
    setPasswordChangeFeedback(null)
    setPasswordChangeSucceeded(false)
    setIsChangingPassword(false)
  }

  const handleConfirmPasswordChange = async () => {
    const currentPassword = currentPasswordInput.trim()
    const newPassword = newPasswordInput.trim()
    const newPasswordConfirmation = newPasswordConfirmationInput.trim()

    if (!currentPassword || !newPassword || !newPasswordConfirmation) {
      setPasswordChangeFeedback('Preencha todos os campos de senha.')
      setPasswordChangeSucceeded(false)
      return
    }

    if (newPassword !== newPasswordConfirmation) {
      setPasswordChangeFeedback('A confirmação da nova senha não confere.')
      setPasswordChangeSucceeded(false)
      return
    }

    const userId = getUserIdFromStoredAccessToken()

    if (!userId) {
      setPasswordChangeFeedback('Não foi possível identificar o usuário autenticado.')
      setPasswordChangeSucceeded(false)
      return
    }

    setIsUpdatingPassword(true)
    setPasswordChangeFeedback(null)

    try {
      await authApiClient.put('/users/change-password', {
        userId,
        password: currentPassword,
        confirmPassword: currentPassword,
        newPassword
      })

      setCurrentPasswordInput('')
      setNewPasswordInput('')
      setNewPasswordConfirmationInput('')
      setPasswordChangeFeedback('Senha alterada com sucesso.')
      setPasswordChangeSucceeded(true)
      setIsChangingPassword(false)
    } catch (error: unknown) {
      const errorMessage =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof error.response === 'object' &&
        error.response !== null &&
        'data' in error.response &&
        typeof error.response.data === 'object' &&
        error.response.data !== null &&
        'message' in error.response.data &&
        typeof error.response.data.message === 'string'
          ? error.response.data.message
          : 'Não foi possível alterar a senha.'

      setPasswordChangeFeedback(errorMessage)
      setPasswordChangeSucceeded(false)
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  if (!hasToken) {
    return <Navigate to="/login" replace />
  }

  const handleLogout = async () => {
    try {
      await AuthService.logout()
    } catch {
      // noop
    } finally {
      localStorage.removeItem('accessToken')
      setEmail(null)
      navigate('/login', { replace: true })
    }
  }

  const handleOpenSettingsPanel = () => {
    if (location.pathname.startsWith('/leads/')) {
      navigate(`/leads${location.search}`)
    }

    if (
      location.pathname === '/negocios/new' ||
      /^\/negocios\/.+/.test(location.pathname)
    ) {
      navigate(`/negocios${location.search}`)
    }

    if (/^\/agenda\/.+/.test(location.pathname)) {
      navigate(`/agenda${location.search}`)
    }

    handleCancelPasswordChange()
    setSelectedSettingsTab('usuario')
    setIsSettingsPanelOpen(true)
  }

  return (
    <main
      style={{
        height: '100vh',
        maxHeight: '100vh',
        display: 'flex',
        background: '#f8fafc',
        overflow: 'hidden'
      }}
    >
      <aside
        style={{
          width: isSidebarCollapsed ? 76 : 280,
          height: '100vh',
          borderRight: sidebarBorder,
          boxShadow: '10px 0 18px -12px rgba(148, 163, 184, 0.36)',
          background: '#fcfdff',
          padding: isSidebarCollapsed ? '20px 10px 16px' : '20px 16px 16px',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 120ms ease'
        }}
      >
        <header
          style={{
            padding: isSidebarCollapsed ? '4px 8px 12px' : '4px 8px 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isSidebarCollapsed ? 'center' : 'space-between',
            gap: 10
          }}
        >
          {!isSidebarCollapsed ? (
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: 2 }}>
              <strong
                style={{
                  fontSize: 20,
                  color: interactionTheme.sidebarItemDefaultColor,
                  lineHeight: 1.15,
                  fontWeight: 500
                }}
              >
                {greetingLabel},
              </strong>
              <strong
                style={{
                  fontSize: 28,
                  color: interactionTheme.sidebarItemDefaultColor,
                  lineHeight: 1.1,
                  fontWeight: 500
                }}
              >
                {userFirstName}
              </strong>
            </div>
          ) : null}
          <button
            type="button"
            aria-label={isSidebarCollapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
            onClick={() => setIsSidebarCollapsed((currentState) => !currentState)}
            style={{
              width: 36,
              height: 36,
              border: 'none',
              background: 'transparent',
              color: interactionTheme.sidebarItemDefaultColor,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            <PanelLeft size={16} />
          </button>
        </header>

        <nav aria-label="Navegação principal" style={{ marginTop: 14, flex: 1, alignContent: 'start' }}>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
            <li>
              <NavLink
                to="/inicio"
                onClick={() => setIsSettingsPanelOpen(false)}
                style={({ isActive }) =>
                  navItemStyle(
                    isSettingsPanelOpen ? false : isActive,
                    hoveredNavKey === 'inicio',
                    isSidebarCollapsed
                  )
                }
                onMouseEnter={() => setHoveredNavKey('inicio')}
                onMouseLeave={() => setHoveredNavKey(null)}
              >
                <Home size={16} />
                {!isSidebarCollapsed ? <span style={{ marginLeft: 8 }}>Início</span> : null}
              </NavLink>
            </li>
          </ul>

          <ul style={{ listStyle: 'none', margin: '6px 0 0', padding: 0, display: 'grid', gap: 6 }}>
            <li>
              <NavLink
                to="/leads"
                onClick={() => setIsSettingsPanelOpen(false)}
                style={({ isActive }) =>
                  navItemStyle(
                    isSettingsPanelOpen ? false : isActive,
                    hoveredNavKey === 'leads',
                    isSidebarCollapsed
                  )
                }
                onMouseEnter={() => setHoveredNavKey('leads')}
                onMouseLeave={() => setHoveredNavKey(null)}
              >
                <Users size={16} />
                {!isSidebarCollapsed ? <span style={{ marginLeft: 8 }}>Leads</span> : null}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/negocios"
                onClick={() => setIsSettingsPanelOpen(false)}
                style={({ isActive }) =>
                  navItemStyle(
                    isSettingsPanelOpen ? false : isActive,
                    hoveredNavKey === 'negocios',
                    isSidebarCollapsed
                  )
                }
                onMouseEnter={() => setHoveredNavKey('negocios')}
                onMouseLeave={() => setHoveredNavKey(null)}
              >
                <Briefcase size={16} />
                {!isSidebarCollapsed ? <span style={{ marginLeft: 8 }}>Negócios</span> : null}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/agenda"
                onClick={() => setIsSettingsPanelOpen(false)}
                style={({ isActive }) =>
                  navItemStyle(
                    isSettingsPanelOpen ? false : isActive,
                    hoveredNavKey === 'agenda',
                    isSidebarCollapsed
                  )
                }
                onMouseEnter={() => setHoveredNavKey('agenda')}
                onMouseLeave={() => setHoveredNavKey(null)}
              >
                <CalendarClock size={16} />
                {!isSidebarCollapsed ? <span style={{ marginLeft: 8 }}>Agenda</span> : null}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/arquivados"
                onClick={() => setIsSettingsPanelOpen(false)}
                style={({ isActive }) =>
                  navItemStyle(
                    isSettingsPanelOpen ? false : isActive,
                    hoveredNavKey === 'arquivados',
                    isSidebarCollapsed
                  )
                }
                onMouseEnter={() => setHoveredNavKey('arquivados')}
                onMouseLeave={() => setHoveredNavKey(null)}
              >
                <Archive size={16} />
                {!isSidebarCollapsed ? <span style={{ marginLeft: 8 }}>Arquivados</span> : null}
              </NavLink>
            </li>
          </ul>

          <ul style={{ listStyle: 'none', margin: '6px 0 0', padding: 0 }}>
            <li>
              <button
                type="button"
                style={{
                  ...navItemStyle(
                    isSettingsPanelOpen,
                    hoveredNavKey === 'configuracoes',
                    isSidebarCollapsed
                  ),
                  fontFamily: 'inherit',
                  cursor: 'pointer'
                }}
                onMouseEnter={() => setHoveredNavKey('configuracoes')}
                onMouseLeave={() => setHoveredNavKey(null)}
                onClick={handleOpenSettingsPanel}
              >
                <Settings size={16} />
                {!isSidebarCollapsed ? <span style={{ marginLeft: 8 }}>Configurações</span> : null}
              </button>
            </li>
          </ul>
        </nav>

        <footer
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isSidebarCollapsed ? 'center' : 'space-between',
            gap: 12,
            marginLeft: isSidebarCollapsed ? -10 : -16,
            marginRight: isSidebarCollapsed ? -10 : -16,
            borderTop: sidebarBorder,
            padding: isSidebarCollapsed ? '14px 10px 4px' : '14px 12px 4px'
          }}
        >
          {!isSidebarCollapsed ? (
            <span
              style={{
                fontSize: 14,
                color: interactionTheme.sidebarItemDefaultColor,
                marginLeft: 8,
                fontWeight: 500,
                fontFamily: 'Canela, serif',
                fontStyle: 'italic'
              }}
            >
              StrativyFlow
            </span>
          ) : null}
          <button
            type="button"
            aria-label="Sair"
            onClick={() => void handleLogout()}
            style={{
              border: 'none',
              background: 'transparent',
              color: interactionTheme.sidebarItemDefaultColor,
              padding: 0,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <LogOut size={16} />
          </button>
        </footer>
      </aside>

      <section
        style={{
          flex: 1,
          minWidth: 0,
          height: '100%',
          overflow: 'hidden',
          boxSizing: 'border-box',
          position: 'relative'
        }}
      >
        <Outlet />

        {isSettingsPanelOpen ? (
          <button
            type="button"
            aria-label="Fechar painel de configuração"
            onClick={() => setIsSettingsPanelOpen(false)}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: settingsPanelWidth,
              bottom: 0,
              zIndex: 20,
              border: 'none',
              padding: 0,
              margin: 0,
              background: 'transparent',
              cursor: 'default'
            }}
          />
        ) : null}

        {isSettingsPanelOpen ? (
          <aside
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              width: settingsPanelWidth,
              zIndex: 30,
              borderLeft: '2px solid #edf1f5',
              background: '#ffffff',
              boxShadow: '-10px 0 18px -12px rgba(148, 163, 184, 0.36)',
              transform: isSettingsPanelVisible ? 'translateX(0)' : 'translateX(100%)',
              transition: 'transform 120ms ease',
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box'
            }}
          >
            <header
              style={{
                padding: '24px 24px 0'
              }}
            >
              <div style={{ display: 'grid', gap: 0 }}>
                <nav
                  style={{
                    padding: 0
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div role="tablist" aria-label="Abas de configurações" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={usuarioTabIsActive}
                        onClick={() => setSelectedSettingsTab('usuario')}
                        onMouseEnter={() => setHoveredSettingsTab('usuario')}
                        onMouseLeave={() => setHoveredSettingsTab(null)}
                        style={{
                          border: 'none',
                          background:
                            usuarioTabIsActive || hoveredSettingsTab === 'usuario'
                              ? interactionTheme.clickableCardHoverBackground
                              : 'transparent',
                          borderRadius: 6,
                          padding: '8px 12px',
                          cursor: 'pointer',
                          fontSize: 14,
                          fontWeight: usuarioTabIsActive ? 600 : 400,
                          color:
                            usuarioTabIsActive || hoveredSettingsTab === 'usuario'
                              ? interactionTheme.activeIconColor
                              : '#6b7280'
                        }}
                      >
                        Usuário
                      </button>

                      <button
                        type="button"
                        role="tab"
                        aria-selected={notificacoesTabIsActive}
                        onClick={() => setSelectedSettingsTab('notificacoes')}
                        onMouseEnter={() => setHoveredSettingsTab('notificacoes')}
                        onMouseLeave={() => setHoveredSettingsTab(null)}
                        style={{
                          border: 'none',
                          background:
                            notificacoesTabIsActive || hoveredSettingsTab === 'notificacoes'
                              ? interactionTheme.clickableCardHoverBackground
                              : 'transparent',
                          borderRadius: 6,
                          padding: '8px 12px',
                          cursor: 'pointer',
                          fontSize: 14,
                          fontWeight: notificacoesTabIsActive ? 600 : 400,
                          color:
                            notificacoesTabIsActive || hoveredSettingsTab === 'notificacoes'
                              ? interactionTheme.activeIconColor
                              : '#6b7280'
                        }}
                      >
                        Notificações
                      </button>
                    </div>

                    <button
                      type="button"
                      aria-label="Fechar configurações"
                      onClick={() => setIsSettingsPanelOpen(false)}
                      style={{
                        height: 28,
                        minWidth: 28,
                        border: 'none',
                        borderRadius: 6,
                        background: 'transparent',
                        color: '#6b7280',
                        padding: '0 8px',
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: 600,
                        lineHeight: 1
                      }}
                    >
                      X
                    </button>
                  </div>
                </nav>

                <div style={{ borderBottom: '1px solid #e5e7eb', marginTop: 8, marginBottom: 10 }} />
                </div>
            </header>

            <div
              style={{
                padding: 24,
                overflowY: 'auto',
                minHeight: 0,
                flex: 1
              }}
            >
              {selectedSettingsTab === 'usuario' ? (
                <article
                  style={{
                    borderRadius: 16,
                    padding: 20,
                    background: '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 22,
                    minHeight: '100%'
                  }}
                >
                  <div style={{ display: 'grid', justifyItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 66,
                        height: 66,
                        borderRadius: 999,
                        background: 'linear-gradient(135deg, #2f8f55 0%, #1f7a4d 100%)',
                        color: '#ffffff',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 33 / 1.3,
                        fontWeight: 800,
                        letterSpacing: 0.4
                      }}
                    >
                      {(
                        (settingsUserName || userFirstName || 'ST')
                          .split(' ')
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((token) => token.charAt(0).toUpperCase())
                          .join('') || 'ST'
                      )}
                    </div>

                    <h3 style={{ margin: 0, color: '#111827', fontSize: 42 / 1.3, fontWeight: 800 }}>
                      {settingsUserName || userFirstName || 'Usuário'}
                    </h3>
                  </div>

                  {!isChangingPassword ? (
                    <>
                      <div style={{ display: 'grid' }}>
                        <div
                          style={{
                            minHeight: 60,
                            display: 'grid',
                            gridTemplateColumns: '22px 112px minmax(0, 1fr)',
                            alignItems: 'center',
                            columnGap: 12,
                            borderBottom: '1px solid #e5e7eb'
                          }}
                        >
                          <Phone size={16} color="#64748b" />
                          <span style={{ color: '#64748b', fontSize: 28 / 1.7, fontWeight: 700 }}>Telefone</span>
                          <span style={{ color: '#1f2937', fontSize: 30 / 1.7, fontWeight: 700, textAlign: 'right' }}>
                            {formatPhoneNumber(settingsUserPhoneNumber)}
                          </span>
                        </div>

                        <div
                          style={{
                            minHeight: 60,
                            display: 'grid',
                            gridTemplateColumns: '22px 112px minmax(0, 1fr)',
                            alignItems: 'center',
                            columnGap: 12,
                            borderBottom: '1px solid #e5e7eb'
                          }}
                        >
                          <Mail size={16} color="#64748b" />
                          <span style={{ color: '#64748b', fontSize: 28 / 1.7, fontWeight: 700 }}>E-mail</span>
                          <span style={{ color: '#1f2937', fontSize: 30 / 1.7, fontWeight: 700, textAlign: 'right' }}>
                            {authUserEmail || '-'}
                          </span>
                        </div>

                        <div
                          style={{
                            minHeight: 60,
                            display: 'grid',
                            gridTemplateColumns: '22px 112px minmax(0, 1fr)',
                            alignItems: 'center',
                            columnGap: 12
                          }}
                        >
                          <Briefcase size={16} color="#64748b" />
                          <span style={{ color: '#64748b', fontSize: 28 / 1.7, fontWeight: 700 }}>Função</span>
                          <span style={{ color: '#1f2937', fontSize: 30 / 1.7, fontWeight: 700, textAlign: 'right' }}>
                            {settingsUserRole}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleOpenChangePasswordForm}
                        style={{
                          marginTop: 'auto',
                          minHeight: 46,
                          border: 'none',
                          borderRadius: 10,
                          background: 'linear-gradient(135deg, #2f8f55 0%, #1f7a4d 100%)',
                          color: '#ffffff',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          fontSize: 30 / 1.7,
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        <Lock size={15} />
                        Alterar senha
                      </button>

                      {passwordChangeFeedback ? (
                        <p
                          style={{
                            margin: 0,
                            color: passwordChangeSucceeded ? '#166534' : '#b91c1c',
                            fontSize: 13,
                            fontWeight: 600
                          }}
                        >
                          {passwordChangeFeedback}
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <div style={{ display: 'grid', gap: 14, marginTop: 4 }}>
                      <div style={{ display: 'grid', gap: 4 }}>
                        <span style={{ color: '#374151', fontSize: 13, fontWeight: 700 }}>Senha atual</span>
                        <input
                          type="password"
                          value={currentPasswordInput}
                          onChange={(event) => setCurrentPasswordInput(event.target.value)}
                          autoComplete="current-password"
                          style={{
                            width: '100%',
                            minHeight: 42,
                            border: '1px solid #d1d5db',
                            borderRadius: 8,
                            padding: '0 12px',
                            fontSize: 14,
                            color: '#111827',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>

                      <div style={{ display: 'grid', gap: 4 }}>
                        <span style={{ color: '#374151', fontSize: 13, fontWeight: 700 }}>Nova senha</span>
                        <input
                          type="password"
                          value={newPasswordInput}
                          onChange={(event) => setNewPasswordInput(event.target.value)}
                          autoComplete="new-password"
                          style={{
                            width: '100%',
                            minHeight: 42,
                            border: '1px solid #d1d5db',
                            borderRadius: 8,
                            padding: '0 12px',
                            fontSize: 14,
                            color: '#111827',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>

                      <div style={{ display: 'grid', gap: 4 }}>
                        <span style={{ color: '#374151', fontSize: 13, fontWeight: 700 }}>Confirmar nova senha</span>
                        <input
                          type="password"
                          value={newPasswordConfirmationInput}
                          onChange={(event) => setNewPasswordConfirmationInput(event.target.value)}
                          autoComplete="new-password"
                          style={{
                            width: '100%',
                            minHeight: 42,
                            border: '1px solid #d1d5db',
                            borderRadius: 8,
                            padding: '0 12px',
                            fontSize: 14,
                            color: '#111827',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                        <button
                          type="button"
                          onClick={handleCancelPasswordChange}
                          disabled={isUpdatingPassword}
                          style={{
                            minHeight: 42,
                            border: '1px solid #d1d5db',
                            borderRadius: 8,
                            background: '#ffffff',
                            color: '#374151',
                            padding: '0 16px',
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: isUpdatingPassword ? 'not-allowed' : 'pointer',
                            opacity: isUpdatingPassword ? 0.7 : 1
                          }}
                        >
                          Cancelar
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            void handleConfirmPasswordChange()
                          }}
                          disabled={isUpdatingPassword}
                          style={{
                            minHeight: 42,
                            border: 'none',
                            borderRadius: 8,
                            background: 'linear-gradient(135deg, #2f8f55 0%, #1f7a4d 100%)',
                            color: '#ffffff',
                            padding: '0 16px',
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: isUpdatingPassword ? 'not-allowed' : 'pointer',
                            opacity: isUpdatingPassword ? 0.7 : 1
                          }}
                        >
                          {isUpdatingPassword ? 'Confirmando...' : 'Confirmar'}
                        </button>
                      </div>

                      {passwordChangeFeedback ? (
                        <p
                          style={{
                            margin: 0,
                            color: passwordChangeSucceeded ? '#166534' : '#b91c1c',
                            fontSize: 13,
                            fontWeight: 600
                          }}
                        >
                          {passwordChangeFeedback}
                        </p>
                      ) : null}
                    </div>
                  )}
                </article>
              ) : null}

              {selectedSettingsTab === 'notificacoes' ? (
                <div style={{ display: 'grid', gap: 18 }}>
                  <div style={{ display: 'grid', gap: 2 }}>
                    <h3 style={{ margin: 0, color: '#111827', fontSize: 38 / 1.3, fontWeight: 800 }}>
                      WhatsApp
                    </h3>
                    <p style={{ margin: 0, color: '#6b7280', fontSize: 14, fontWeight: 600 }}>
                      Gerencie os números que receberão notificações de novos leads no Flow!
                    </p>
                    <p style={{ margin: 0, color: '#6b7280', fontSize: 14, fontWeight: 600 }}>
                       Adicione os números no formato internacional, por exemplo: 5511999999999.
                    </p>
                  </div>

                  <div
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: 12,
                      background: '#ffffff',
                      padding: 0,
                      display: 'grid',
                      overflow: 'hidden'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 14, borderBottom: '1px solid #e5e7eb' }}>
                      <input
                        type="text"
                        value={notificationNumberInput}
                        onChange={(event) => setNotificationNumberInput(event.target.value)}
                        placeholder="Adicionar número WhatsApp"
                        style={{
                          flex: 1,
                          minWidth: 0,
                          height: 40,
                          border: '1px solid #d1d5db',
                          borderRadius: 8,
                          padding: '0 12px',
                          fontSize: 14,
                          color: '#111827',
                          boxSizing: 'border-box'
                        }}
                      />

                      <button
                        type="button"
                        onClick={() => {
                          void handleAddNotificationNumber()
                        }}
                        disabled={isSavingNotificationNumbers}
                        style={{
                          height: 40,
                          border: 'none',
                          borderRadius: 8,
                          background: 'linear-gradient(135deg, #2f8f55 0%, #1f7a4d 100%)',
                          color: '#ffffff',
                          padding: '0 18px',
                          fontSize: 30 / 1.7,
                          fontWeight: 700,
                          cursor: isSavingNotificationNumbers ? 'not-allowed' : 'pointer',
                          opacity: isSavingNotificationNumbers ? 0.7 : 1
                        }}
                      >
                        Adicionar
                      </button>
                    </div>

                    {notificationNumbers.length ? (
                      <ul
                        style={{
                          margin: 0,
                          padding: '10px 12px',
                          display: 'grid',
                          gap: 6,
                          listStyle: 'none'
                        }}
                      >
                        {notificationNumbers.map((phoneNumber) => (
                          <li
                            key={phoneNumber}
                            style={{
                              minHeight: 48,
                              border: '1px solid #e5e7eb',
                              borderRadius: 12,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '6px 12px',
                              gap: 12
                            }}
                          >
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                              <MessageCircle size={17} color="#1f7a4d" />
                              <span style={{ color: '#111827', fontSize: 16, fontWeight: 700 }}>
                                {phoneNumber}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                void handleRemoveNotificationNumber(phoneNumber)
                              }}
                              disabled={isSavingNotificationNumbers}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                color: '#9ca3af',
                                cursor: isSavingNotificationNumbers ? 'not-allowed' : 'pointer',
                                padding: 4,
                                lineHeight: 0,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: isSavingNotificationNumbers ? 0.7 : 1
                              }}
                              aria-label="Remover numero"
                            >
                              <Trash2 size={16} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>
                        Nenhum número cadastrado.
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <button
                      type="button"
                      onClick={() => {
                        void handleClearNotificationNumbers()
                      }}
                      disabled={isSavingNotificationNumbers}
                      style={{
                        height: 40,
                        border: '1px solid #fecaca',
                        borderRadius: 10,
                        background: '#ffffff',
                        color: '#dc2626',
                        padding: '0 14px',
                        fontSize: 30 / 1.7,
                        fontWeight: 700,
                        cursor: isSavingNotificationNumbers ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        opacity: isSavingNotificationNumbers ? 0.7 : 1
                      }}
                    >
                      <Trash2 size={16} />
                      Limpar lista
                    </button>
                  </div>

                  {notificationNumbersFeedback ? (
                    <p
                      style={{
                        margin: 0,
                        color:
                          notificationNumbersFeedback.includes('sucesso')
                            ? '#166534'
                            : '#b91c1c',
                        fontSize: 13,
                        fontWeight: 600
                      }}
                    >
                      {notificationNumbersFeedback}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </aside>
        ) : null}
      </section>
    </main>
  )
}
