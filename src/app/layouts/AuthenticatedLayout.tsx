import { AlertCircle, Archive, Bell, Briefcase, CalendarClock, Check, CheckCircle2, ChevronLeft, CircleDollarSign, Edit, FileText, Home, Lock, LogOut, Mail, MessageCircle, MoreHorizontal, PanelLeft, Phone, Settings, Trash2, UserPlus, Users, X } from 'lucide-react'
import { useAtomValue, useSetAtom } from 'jotai'
import { useEffect, useState } from 'react'
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'

import { interactionTheme } from '../theme/brandTheme'
import { useViewportBreakpoint } from '../theme/useViewportBreakpoint'
import { authUserEmailAtom } from '../../core/state/authUserEmailAtom'
import { appApiClient } from '../../core/api/appApiClient'
import { authApiClient } from '../../core/api/authApiClient'
import { useRealtime } from '../../core/realtime/useRealtime'
import { AuthService } from '../../features/auth/services/AuthService'

export type AuthenticatedLayoutOutletContext = {
  isMobileHomeNotificationsOpen: boolean
  setIsMobileHomeNotificationsOpen: (isOpen: boolean) => void
  setMobileHomeNotificationsCount: (count: number) => void
}

type SettingsTab = 'usuario' | 'notificacoes'
type NotificationChannelKey = 'inApp' | 'whatsApp' | 'email'
type NotificationPreference = {
  id: string
  title: string
  description: string
  icon: 'bell' | 'message' | 'clock' | 'list'
  channels: Record<NotificationChannelKey, boolean>
}

type UserInformationsResponse = {
  id: string
  name?: string | null
  email?: string | null
  phoneNumber?: string | null
  notificationWhatsAppNumbers?: string[]
  notificationEmails?: string[]
  notificationPreferences?: Record<string, string[]>
}

const INITIAL_NOTIFICATION_PREFERENCES: NotificationPreference[] = [
  {
    id: 'new-lead',
    title: 'Novo lead',
    description: 'Quando um novo lead é criado no sistema',
    icon: 'bell',
    channels: { inApp: true, whatsApp: false, email: false }
  },
  {
    id: 'new-message',
    title: 'Mensagem recebida',
    description: 'Quando você recebe uma mensagem de um lead',
    icon: 'message',
    channels: { inApp: true, whatsApp: true, email: false }
  },
  {
    id: 'followup-1h',
    title: 'Follow-up a 1 hora do vencimento',
    description: 'Quando falta 1 hora para um follow-up vencer',
    icon: 'clock',
    channels: { inApp: true, whatsApp: false, email: false }
  },
  {
    id: 'followup-list',
    title: 'Lista Follow-ups do dia',
    description: 'Resumo diário de todos os follow-ups para hoje',
    icon: 'list',
    channels: { inApp: true, whatsApp: false, email: true }
  }
]

const buildNotificationPreferences = (
  apiPreferences?: Record<string, string[]> | null
): NotificationPreference[] => {
  const preferences = INITIAL_NOTIFICATION_PREFERENCES.map((pref) => ({
    ...pref,
    channels: {
      inApp: false,
      whatsApp: false,
      email: false
    }
  }))

  if (!apiPreferences || Object.keys(apiPreferences).length === 0) {
    return preferences
  }

  const notificationTypeMap: Record<string, string> = {
    NEW_LEAD: 'new-lead',
    MESSAGE_RECEIVED: 'new-message',
    FOLLOWUP_ONE_HOUR: 'followup-1h',
    DAILY_FOLLOWUP_SUMMARY: 'followup-list'
  }

  const channelMap: Record<string, keyof typeof preferences[0]['channels']> = {
    APP: 'inApp',
    WHATSAPP: 'whatsApp',
    EMAIL: 'email'
  }

  Object.entries(apiPreferences).forEach(([notificationType, channels]) => {
    const preferencesId = notificationTypeMap[notificationType]
    const preference = preferences.find((p) => p.id === preferencesId)

    if (preference && Array.isArray(channels)) {
      channels.forEach((channel) => {
        const channelKey = channelMap[channel]
        if (channelKey) {
          preference.channels[channelKey] = true
        }
      })
    }
  })

  return preferences
}

type WhatsAppNumber = {
  id: string
  number: string
}

type EmailAddress = {
  id: string
  email: string
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
  const { isMobile } = useViewportBreakpoint()
  const authUserEmail = useAtomValue(authUserEmailAtom)
  const setEmail = useSetAtom(authUserEmailAtom)
  const location = useLocation()
  const navigate = useNavigate()
  const realtime = useRealtime()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false)
  const [hoveredNavKey, setHoveredNavKey] = useState<string | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false)
  const [isMobileHomeNotificationsOpen, setIsMobileHomeNotificationsOpen] = useState<boolean>(false)
  const [mobileHomeNotificationsCount, setMobileHomeNotificationsCount] = useState<number>(0)
  const [isMobileNotificationsButtonHovered, setIsMobileNotificationsButtonHovered] = useState<boolean>(false)
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState<boolean>(false)
  const [isSettingsPanelVisible, setIsSettingsPanelVisible] = useState<boolean>(false)
  const [selectedSettingsTab, setSelectedSettingsTab] = useState<SettingsTab>('usuario')
  const [hoveredSettingsTab, setHoveredSettingsTab] = useState<SettingsTab | null>(null)
  const [selectedNotificationsTab, setSelectedNotificationsTab] = useState<'tipos' | 'canais' | 'preferencias'>('tipos')
  const [whatsAppNumbers, setWhatsAppNumbers] = useState<WhatsAppNumber[]>([])
  const [emailAddresses, setEmailAddresses] = useState<EmailAddress[]>([])
  const [isAddingWhatsAppNumber, setIsAddingWhatsAppNumber] = useState<boolean>(false)
  const [newWhatsAppNumber, setNewWhatsAppNumber] = useState<string>('')
  const [editingWhatsAppNumberId, setEditingWhatsAppNumberId] = useState<string | null>(null)
  const [editingWhatsAppNumberValue, setEditingWhatsAppNumberValue] = useState<string>('')
  const [isAddingEmailAddress, setIsAddingEmailAddress] = useState<boolean>(false)
  const [newEmailAddress, setNewEmailAddress] = useState<string>('')
  const [editingEmailAddressId, setEditingEmailAddressId] = useState<string | null>(null)
  const [editingEmailAddressValue, setEditingEmailAddressValue] = useState<string>('')
  const [isListFollowupsTooltipVisible, setIsListFollowupsTooltipVisible] = useState<boolean>(false)
  const [isLoadingNotifications, setIsLoadingNotifications] = useState<boolean>(false)
  const [isUpdatingPreferences, setIsUpdatingPreferences] = useState<boolean>(false)
  const [headerUserName, setHeaderUserName] = useState<string>('')
  const [settingsUserRole, setSettingsUserRole] = useState<string>('Administrador')
  const [settingsUserName, setSettingsUserName] = useState<string>('')
  const [settingsUserEmail, setSettingsUserEmail] = useState<string>('')
  const [settingsUserPhoneNumber, setSettingsUserPhoneNumber] = useState<string>('')
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false)
  const [currentPasswordInput, setCurrentPasswordInput] = useState<string>('')
  const [newPasswordInput, setNewPasswordInput] = useState<string>('')
  const [newPasswordConfirmationInput, setNewPasswordConfirmationInput] = useState<string>('')
  const [isUpdatingPassword, setIsUpdatingPassword] = useState<boolean>(false)
  const [passwordChangeFeedback, setPasswordChangeFeedback] = useState<string | null>(null)
  const [passwordChangeSucceeded, setPasswordChangeSucceeded] = useState<boolean>(false)
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreference[]>([])
  const greetingLabel = getGreetingLabel()
  const userFirstName =
    getFirstName(headerUserName) || getFirstName(settingsUserName) || getUserFirstName(authUserEmail)

  useEffect(() => {
    if (!hasToken) {
      return
    }

    realtime.connect()

    return () => {
      realtime.disconnect()
    }
  }, [hasToken, realtime])

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
  }, [hasToken, setEmail])

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
    setIsMobileMenuOpen(false)
    setIsMobileHomeNotificationsOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (isMobile) {
      return
    }

    setIsMobileHomeNotificationsOpen(false)
  }, [isMobile])

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
      setSettingsUserName(primaryUserInformation?.name?.trim() ?? '')
      setSettingsUserEmail(primaryUserInformation?.email?.trim() ?? '')
      setSettingsUserPhoneNumber(primaryUserInformation?.phoneNumber?.trim() ?? '')
    }

    void loadUserInformations()

    return () => {
      isMounted = false
    }
  }, [isSettingsPanelOpen])

  useEffect(() => {
    if (!isSettingsPanelOpen || selectedSettingsTab !== 'notificacoes') {
      return
    }

    let isMounted = true

    const loadNotificationData = async () => {
      try {
        setIsLoadingNotifications(true)
        const { data } = await appApiClient.get<UserInformationsResponse[]>('/user/user-informations')

        if (!isMounted) {
          return
        }

        const primaryUserInformation = data[0]

        // Load WhatsApp Numbers
        const whatsAppList = (primaryUserInformation?.notificationWhatsAppNumbers ?? []).map((number, index) => ({
          id: String(index + 1),
          number
        }))
        setWhatsAppNumbers(whatsAppList)

        // Load Email Addresses
        const emailList = (primaryUserInformation?.notificationEmails ?? []).map((email, index) => ({
          id: String(index + 1),
          email
        }))
        setEmailAddresses(emailList)

        // Load Notification Preferences
        const preferences = buildNotificationPreferences(primaryUserInformation?.notificationPreferences)
        setNotificationPreferences(preferences)
      } finally {
        if (isMounted) {
          setIsLoadingNotifications(false)
        }
      }
    }

    void loadNotificationData()

    return () => {
      isMounted = false
    }
  }, [isSettingsPanelOpen, selectedSettingsTab])

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
  const isHomePage = location.pathname === '/inicio'
  const mobileHomeHeaderHeight = 74
  const mobileBottomNavHeight = 82
  const mobileBottomNavBottomInset = -8
  const mobileBottomNavOffset = `${mobileBottomNavHeight + mobileBottomNavBottomInset}px`
  const mobileBodyExtraTrim = 40
  const hideMobileNotificationIcons = isMobile && selectedSettingsTab === 'notificacoes'
  const mobileNotificationActionTextStyle = {
    border: 'none',
    background: 'transparent',
    color: '#6b7280',
    cursor: 'pointer',
    padding: 0,
    fontSize: 12,
    fontWeight: 700
  }

  const renderSettingsTabs = () => (
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
  )



  const renderNotificationIcon = (iconType: NotificationPreference['icon']) => {
    if (hideMobileNotificationIcons) {
      return null
    }

    const iconProps = { size: 20, color: '#2f8f55' }
    switch (iconType) {
      case 'bell':
        return <UserPlus {...iconProps} />
      case 'message':
        return <MessageCircle {...iconProps} />
      case 'clock':
        return <CalendarClock {...iconProps} />
      case 'list':
        return <CheckCircle2 {...iconProps} />
      default:
        return <UserPlus {...iconProps} />
    }
  }

  const convertPreferencesToBackendFormat = (
    prefs: NotificationPreference[]
  ): Record<string, string[]> => {
    const notificationTypeMap: Record<string, string> = {
      'new-lead': 'NEW_LEAD',
      'new-message': 'MESSAGE_RECEIVED',
      'followup-1h': 'FOLLOWUP_ONE_HOUR',
      'followup-list': 'DAILY_FOLLOWUP_SUMMARY'
    }

    const channelMap: Record<NotificationChannelKey, string> = {
      inApp: 'APP',
      whatsApp: 'WHATSAPP',
      email: 'EMAIL'
    }

    const result: Record<string, string[]> = {}

    prefs.forEach((pref) => {
      const backendType = notificationTypeMap[pref.id]
      if (!backendType) return

      const enabledChannels = Object.entries(pref.channels)
        .filter(([, isEnabled]) => isEnabled)
        .map(([channel]) => channelMap[channel as NotificationChannelKey])

      if (enabledChannels.length > 0) {
        result[backendType] = enabledChannels
      }
    })

    return result
  }

  const persistNotificationPreferences = async (updatedPreferences: NotificationPreference[]) => {
    try {
      setIsUpdatingPreferences(true)
      const backendFormat = convertPreferencesToBackendFormat(updatedPreferences)

      const userInformationsId = getUserIdFromStoredAccessToken()
      if (!userInformationsId) return

      await appApiClient.patch(
        `/user/user-informations/${userInformationsId}/preferences`,
        { notificationPreferences: backendFormat }
      )
    } catch (error) {
      console.error('Erro ao atualizar preferências de notificação:', error)
    } finally {
      setIsUpdatingPreferences(false)
    }
  }

  const toggleNotificationChannel = (
    preferenceId: NotificationPreference['id'],
    channel: NotificationChannelKey
  ) => {
    const updatedPreferences = notificationPreferences.map((pref) =>
      pref.id === preferenceId
        ? {
            ...pref,
            channels: {
              ...pref.channels,
              [channel]: !pref.channels[channel]
            }
          }
        : pref
    )

    setNotificationPreferences(updatedPreferences)
    void persistNotificationPreferences(updatedPreferences)
  }

  const renderChannelSwitch = (
    preferenceId: NotificationPreference['id'],
    channel: NotificationChannelKey,
    isEnabled: boolean
  ) => {
    return (
      <button
        type="button"
        onClick={() => toggleNotificationChannel(preferenceId, channel)}
        disabled={isUpdatingPreferences}
        aria-label={`Alternar ${channel}`}
        style={{
          width: 44,
          height: 26,
          borderRadius: 999,
          border: 'none',
          background: isEnabled ? '#2f8f55' : '#d1d5db',
          padding: 3,
          cursor: isUpdatingPreferences ? 'not-allowed' : 'pointer',
          opacity: isUpdatingPreferences ? 0.6 : 1,
          display: 'inline-flex',
          justifyContent: isEnabled ? 'flex-end' : 'flex-start',
          alignItems: 'center',
          transition: 'all 120ms ease'
        }}
      >
        <span
          style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: '#ffffff',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.2)'
          }}
        />
      </button>
    )
  }

  const formatWhatsAppNumber = (number: string): string => {
    const digits = number.replace(/\D/g, '')
    if (digits.length < 10) return number
    
    // Remove country code if present
    let localDigits = digits
    if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
      localDigits = digits.slice(2)
    }
    
    const areaCode = localDigits.slice(0, 2)
    
    if (localDigits.length === 10) {
      // Fixo: (DDD) XXXX-XXXX
      const firstPart = localDigits.slice(2, 6)
      const secondPart = localDigits.slice(6, 10)
      return `(${areaCode}) ${firstPart}-${secondPart}`
    } else {
      // Celular: (DDD) 9XXXX-XXXX
      const firstPart = localDigits.slice(2, 7)
      const secondPart = localDigits.slice(7, 11)
      return `(${areaCode}) ${firstPart}-${secondPart}`
    }
  }

  const formatWhatsAppInputNumber = (input: string): string => {
    const digits = input.replace(/\D/g, '').slice(0, 11)
    
    if (digits.length === 0) return ''
    
    const ddd = digits.slice(0, 2)
    const numberPart = digits.slice(2)
    
    if (digits.length <= 2) {
      return `(${ddd}`
    }
    
    if (numberPart.length <= 4) {
      return `(${ddd})${numberPart}`
    }
    
    if (numberPart.length <= 8) {
      return `(${ddd})${numberPart.slice(0, 4)}-${numberPart.slice(4)}`
    }
    
    return `(${ddd})${numberPart.slice(0, 5)}-${numberPart.slice(5, 9)}`
  }

  const isValidWhatsAppNumber = (number: string): boolean => {
    const digits = number.replace(/\D/g, '')
    return digits.length === 10 || digits.length === 11
  }

  const handleDeleteWhatsAppNumber = (id: string) => {
    // Delete immediately without confirmation
    setWhatsAppNumbers((prev) => prev.filter((num) => num.id !== id))
  }

  const handleStartEditWhatsAppNumber = (id: string, number: string) => {
    setEditingWhatsAppNumberId(id)
    // Remove 55 from the number to show in input (user edits only local digits)
    const digits = number.replace(/\D/g, '')
    const localDigits = digits.startsWith('55') ? digits.slice(2) : digits
    setEditingWhatsAppNumberValue(localDigits)
  }

  const handleCancelEditWhatsAppNumber = () => {
    setEditingWhatsAppNumberId(null)
    setEditingWhatsAppNumberValue('')
  }

  const handleConfirmEditWhatsAppNumber = (id: string) => {
    if (isValidWhatsAppNumber(editingWhatsAppNumberValue)) {
      const digits = editingWhatsAppNumberValue.replace(/\D/g, '')
      // Add country code if not present
      const numberWithCountryCode = digits.startsWith('55') ? digits : '55' + digits
      setWhatsAppNumbers((prev) =>
        prev.map((num) => (num.id === id ? { ...num, number: numberWithCountryCode } : num))
      )
      setEditingWhatsAppNumberId(null)
      setEditingWhatsAppNumberValue('')
    }
  }

  const handleDeleteEmailAddress = (id: string) => {
    // Delete immediately without confirmation
    setEmailAddresses((prev) => prev.filter((email) => email.id !== id))
  }

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleStartEditEmailAddress = (id: string, email: string) => {
    setEditingEmailAddressId(id)
    setEditingEmailAddressValue(email)
  }

  const handleCancelEditEmailAddress = () => {
    setEditingEmailAddressId(null)
    setEditingEmailAddressValue('')
  }

  const handleConfirmEditEmailAddress = (id: string) => {
    if (isValidEmail(editingEmailAddressValue)) {
      setEmailAddresses((prev) =>
        prev.map((email) => (email.id === id ? { ...email, email: editingEmailAddressValue } : email))
      )
      setEditingEmailAddressId(null)
      setEditingEmailAddressValue('')
    }
  }

  const handleCancelAddEmailAddress = () => {
    setIsAddingEmailAddress(false)
    setNewEmailAddress('')
  }

  const handleConfirmAddEmailAddress = () => {
    if (isValidEmail(newEmailAddress)) {
      const newId = String(Math.max(...emailAddresses.map(e => parseInt(e.id, 10)), 0) + 1)
      setEmailAddresses((prev) => [{ id: newId, email: newEmailAddress }, ...prev])
      setIsAddingEmailAddress(false)
      setNewEmailAddress('')
    }
  }

  const handleCancelAddWhatsAppNumber = () => {
    setIsAddingWhatsAppNumber(false)
    setNewWhatsAppNumber('')
  }

  const handleConfirmAddWhatsAppNumber = () => {
    if (isValidWhatsAppNumber(newWhatsAppNumber)) {
      const newId = String(Math.max(...whatsAppNumbers.map(n => parseInt(n.id, 10)), 0) + 1)
      const digits = newWhatsAppNumber.replace(/\D/g, '')
      // Add country code if not present
      const numberWithCountryCode = digits.startsWith('55') ? digits : '55' + digits
      setWhatsAppNumbers((prev) => [{ id: newId, number: numberWithCountryCode }, ...prev])
      setIsAddingWhatsAppNumber(false)
      setNewWhatsAppNumber('')
    }
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
    setIsMobileMenuOpen(false)
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
          display: isMobile ? 'none' : 'flex',
          width: isSidebarCollapsed ? 76 : 280,
          height: '100vh',
          borderRight: sidebarBorder,
          boxShadow: '10px 0 18px -12px rgba(148, 163, 184, 0.36)',
          background: '#fcfdff',
          padding: isSidebarCollapsed ? '20px 10px 16px' : '20px 16px 16px',
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
                to="/arquivos"
                onClick={() => setIsSettingsPanelOpen(false)}
                style={({ isActive }) =>
                  navItemStyle(
                    isSettingsPanelOpen ? false : isActive,
                    hoveredNavKey === 'arquivos',
                    isSidebarCollapsed
                  )
                }
                onMouseEnter={() => setHoveredNavKey('arquivos')}
                onMouseLeave={() => setHoveredNavKey(null)}
              >
                <FileText size={16} />
                {!isSidebarCollapsed ? <span style={{ marginLeft: 8 }}>Arquivos</span> : null}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/financeiro"
                onClick={() => setIsSettingsPanelOpen(false)}
                style={({ isActive }) =>
                  navItemStyle(
                    isSettingsPanelOpen ? false : isActive,
                    hoveredNavKey === 'financeiro',
                    isSidebarCollapsed
                  )
                }
                onMouseEnter={() => setHoveredNavKey('financeiro')}
                onMouseLeave={() => setHoveredNavKey(null)}
              >
                <CircleDollarSign size={16} />
                {!isSidebarCollapsed ? <span style={{ marginLeft: 8 }}>Financeiro</span> : null}
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
                {!isSidebarCollapsed ? <span style={{ marginLeft: 8 }}>Leads Arquivados</span> : null}
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
          height: isMobile ? `calc(100% - ${mobileBottomNavOffset} - ${mobileBodyExtraTrim}px)` : '100%',
          maxHeight: isMobile ? `calc(100% - ${mobileBottomNavOffset} - ${mobileBodyExtraTrim}px)` : '100%',
          overflow: 'hidden',
          boxSizing: 'border-box',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          paddingTop: 0,
          paddingBottom: 0
        }}
      >
        {isMobile && isHomePage ? (
          <header
            style={{
              position: 'relative',
              zIndex: 10,
              height: mobileHomeHeaderHeight,
              flexShrink: 0,
              padding: '10px 20px',
              background: '#fcfdff',
              borderBottom: sidebarBorder,
              boxShadow: '0 8px 18px -16px rgba(148, 163, 184, 0.45)',
              boxSizing: 'border-box'
            }}
          >
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ display: 'grid', gap: 2, minWidth: 0 }}>
                <span
                  style={{
                    fontSize: 14,
                    color: interactionTheme.sidebarItemDefaultColor,
                    lineHeight: 1.2,
                    fontWeight: 500,
                    fontFamily: 'Canela, serif',
                    fontStyle: 'italic'
                  }}
                >
                  StrativyFlow
                </span>
                <strong
                  style={{
                    fontSize: 16,
                    color: interactionTheme.sidebarItemDefaultColor,
                    lineHeight: 1.2,
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {greetingLabel}, {userFirstName}
                </strong>
              </div>

              <button
                type="button"
                aria-label="Abrir notificações"
                onClick={() => setIsMobileHomeNotificationsOpen(true)}
                onMouseEnter={() => setIsMobileNotificationsButtonHovered(true)}
                onMouseLeave={() => setIsMobileNotificationsButtonHovered(false)}
                style={{
                  position: 'relative',
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  border: 'none',
                  background:
                    isMobileHomeNotificationsOpen || isMobileNotificationsButtonHovered
                      ? interactionTheme.sidebarItemActiveBackground
                      : 'transparent',
                  color:
                    isMobileHomeNotificationsOpen || isMobileNotificationsButtonHovered
                      ? interactionTheme.sidebarItemActiveColor
                      : interactionTheme.sidebarItemDefaultColor,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'background 120ms ease, color 120ms ease'
                }}
              >
                <Bell size={18} />
                {mobileHomeNotificationsCount > 0 ? (
                  <span
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      minWidth: 18,
                      height: 18,
                      borderRadius: 999,
                      background: '#dc2626',
                      color: '#ffffff',
                      fontSize: 11,
                      fontWeight: 700,
                      lineHeight: 1,
                      padding: '0 4px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid #fcfdff'
                    }}
                  >
                    {mobileHomeNotificationsCount > 99 ? '99+' : mobileHomeNotificationsCount}
                  </span>
                ) : null}
              </button>
            </div>
          </header>
        ) : null}

        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <Outlet
            context={{
              isMobileHomeNotificationsOpen,
              setIsMobileHomeNotificationsOpen,
              setMobileHomeNotificationsCount
            } satisfies AuthenticatedLayoutOutletContext}
          />
        </div>

        {isSettingsPanelOpen && !isMobile ? (
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
              background: isMobile ? 'rgba(15, 23, 42, 0.18)' : 'transparent',
              cursor: 'default'
            }}
          />
        ) : null}

        {isSettingsPanelOpen ? (
          <aside
            style={{
              position: isMobile ? 'fixed' : 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: isMobile ? 0 : 'auto',
              width: isMobile ? '100vw' : settingsPanelWidth,
              zIndex: isMobile ? 80 : 30,
              borderLeft: isMobile ? 'none' : '2px solid #edf1f5',
              background: '#ffffff',
              boxShadow: isMobile ? 'none' : '-10px 0 18px -12px rgba(148, 163, 184, 0.36)',
              transform: isSettingsPanelVisible ? 'translateX(0)' : 'translateX(100%)',
              transition: 'transform 120ms ease',
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box'
            }}
          >
            <header
              style={{
                padding: isMobile ? '18px 16px 0' : '24px 24px 0'
              }}
            >
              <div style={{ display: 'grid', gap: 0 }}>
                {isMobile ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 36 }}>
                      <button
                        type="button"
                        aria-label="Voltar de configurações"
                        onClick={() => setIsSettingsPanelOpen(false)}
                        style={{
                          height: 32,
                          minWidth: 32,
                          border: 'none',
                          borderRadius: 8,
                          background: 'transparent',
                          color: '#0f172a',
                          padding: 0,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <ChevronLeft size={20} />
                      </button>

                      <strong style={{ color: '#0f172a', fontSize: 22, fontWeight: 800, lineHeight: 1.1 }}>
                        Configurações
                      </strong>
                    </div>

                    <div style={{ marginTop: 12 }}>
                      {renderSettingsTabs()}
                    </div>
                  </>
                ) : (
                  <nav style={{ padding: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      {renderSettingsTabs()}

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
                )}

                <div style={{ borderBottom: '1px solid #e5e7eb', marginTop: 8, marginBottom: 10 }} />
              </div>
            </header>

            <div
              style={{
                padding: isMobile ? '0 16px calc(24px + env(safe-area-inset-bottom))' : '0 24px 24px 24px',
                overflowY: 'auto',
                overflowX: 'hidden',
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
                    minHeight: '100%',
                    minWidth: 0,
                    overflowX: 'hidden',
                    boxSizing: 'border-box'
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

                    <h3
                      style={{
                        margin: 0,
                        color: '#111827',
                        fontSize: 42 / 1.3,
                        fontWeight: 800,
                        width: '100%',
                        textAlign: 'center',
                        lineHeight: 1.2,
                        overflowWrap: 'anywhere'
                      }}
                    >
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
                            gridTemplateColumns: isMobile
                              ? '20px 88px minmax(0, 1fr)'
                              : '22px 112px minmax(0, 1fr)',
                            alignItems: 'center',
                            columnGap: 12,
                            borderBottom: '1px solid #e5e7eb'
                          }}
                        >
                          <Phone size={16} color="#64748b" />
                          <span style={{ color: '#64748b', fontSize: 28 / 1.7, fontWeight: 700 }}>Telefone</span>
                          <span style={{ color: '#1f2937', fontSize: 30 / 1.7, fontWeight: 700, textAlign: 'right', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {formatPhoneNumber(settingsUserPhoneNumber)}
                          </span>
                        </div>

                        <div
                          style={{
                            minHeight: 60,
                            display: 'grid',
                            gridTemplateColumns: isMobile
                              ? '20px 88px minmax(0, 1fr)'
                              : '22px 112px minmax(0, 1fr)',
                            alignItems: 'center',
                            columnGap: 12,
                            borderBottom: '1px solid #e5e7eb'
                          }}
                        >
                          <Mail size={16} color="#64748b" />
                          <span style={{ color: '#64748b', fontSize: 28 / 1.7, fontWeight: 700 }}>E-mail</span>
                          <span style={{ color: '#1f2937', fontSize: 30 / 1.7, fontWeight: 700, textAlign: 'right', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {settingsUserEmail || authUserEmail || '-'}
                          </span>
                        </div>

                        <div
                          style={{
                            minHeight: 60,
                            display: 'grid',
                            gridTemplateColumns: isMobile
                              ? '20px 88px minmax(0, 1fr)'
                              : '22px 112px minmax(0, 1fr)',
                            alignItems: 'center',
                            columnGap: 12
                          }}
                        >
                          <Briefcase size={16} color="#64748b" />
                          <span style={{ color: '#64748b', fontSize: 28 / 1.7, fontWeight: 700 }}>Função</span>
                          <span style={{ color: '#1f2937', fontSize: 30 / 1.7, fontWeight: 700, textAlign: 'right', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {settingsUserRole}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleOpenChangePasswordForm}
                        style={{
                          marginTop: isMobile ? 8 : 12,
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
                <div
                  style={{
                    borderRadius: 12,
                    background: '#ffffff',
                    overflow: 'hidden',
                    display: 'grid',
                    gridTemplateRows: 'auto 1fr'
                  }}
                >
                  <div style={{ display: 'flex', gap: 8, padding: '12px 16px 0' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedNotificationsTab('tipos')}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 8,
                        background: selectedNotificationsTab === 'tipos' ? '#2f8f55' : '#ffffff',
                        color: selectedNotificationsTab === 'tipos' ? '#ffffff' : '#111827',
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        border: selectedNotificationsTab === 'tipos' ? 'none' : '1px solid #d1d5db',
                        flex: 1
                      }}
                    >
                      {!hideMobileNotificationIcons ? <Bell size={16} /> : null}
                      Eventos
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedNotificationsTab('canais')}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 8,
                        background: selectedNotificationsTab === 'canais' ? '#2f8f55' : '#ffffff',
                        color: selectedNotificationsTab === 'canais' ? '#ffffff' : '#111827',
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        border: selectedNotificationsTab === 'canais' ? 'none' : '1px solid #d1d5db',
                        flex: 1
                      }}
                    >
                      {!hideMobileNotificationIcons ? <MessageCircle size={16} /> : null}
                      WhatsApps
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedNotificationsTab('preferencias')}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 8,
                        background: selectedNotificationsTab === 'preferencias' ? '#2f8f55' : '#ffffff',
                        color: selectedNotificationsTab === 'preferencias' ? '#ffffff' : '#111827',
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        border: selectedNotificationsTab === 'preferencias' ? 'none' : '1px solid #d1d5db',
                        flex: 1
                      }}
                    >
                      {!hideMobileNotificationIcons ? <Mail size={16} /> : null}
                      E-mails
                    </button>
                  </div>

                  {selectedNotificationsTab === 'tipos' ? (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '12px 16px 0' }}>
                        <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.2px' }}>
                          Notificações
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#5b5b5b' }}>
                          Escolha quais eventos você deseja receber e por qual canal
                        </div>
                      </div>

                      {isLoadingNotifications ? (
                        <div style={{ padding: '12px 16px', color: '#666', fontSize: 14 }}>
                          Carregando dados de notificações...
                        </div>
                      ) : (
                        <>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '40% 20% 20% 20%',
                              alignItems: 'center',
                              gap: 0,
                              padding: '12px 16px',
                              background: '#ffffff',
                              marginTop: 24,
                            }}
                          >
                            <span style={{ color: '#6b7280', fontSize: 13, fontWeight: 600 }}>
                              
                            </span>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                                color: '#111827',
                                fontSize: 14,
                                fontWeight: 600
                              }}
                            >
                              {!hideMobileNotificationIcons ? <Bell size={15} /> : null}
                              App
                            </span>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                                color: '#111827',
                                fontSize: 14,
                                fontWeight: 600
                              }}
                            >
                              {!hideMobileNotificationIcons ? <MessageCircle size={15} /> : null}
                              WhatsApp
                            </span>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                                color: '#111827',
                                fontSize: 14,
                                fontWeight: 600
                              }}
                            >
                              {!hideMobileNotificationIcons ? <Mail size={15} /> : null}
                              E-mail
                            </span>
                          </div>

                          <div>
                            {notificationPreferences.map((preference, index) => (
                          <div
                            key={preference.id}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '40% 20% 20% 20%',
                              alignItems: 'center',
                              gap: 0,
                              padding: '14px 16px',
                              borderBottom:
                                index === notificationPreferences.length - 1
                                  ? 'none'
                                  : '1px solid #e5e7eb',
                              background: '#ffffff'
                            }}
                          >
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                              {renderNotificationIcon(preference.icon)}
                              <span
                                style={{
                                  color: '#111827',
                                  fontSize: 14,
                                  fontWeight: 600,
                                  lineHeight: 1.2
                                }}
                              >
                                {preference.title}
                              </span>
                              {preference.title === 'Lista Follow-ups do dia' ? (
                                <div style={{ position: 'relative', display: 'inline-flex' }}>
                                  <button
                                    type="button"
                                    onMouseEnter={() => setIsListFollowupsTooltipVisible(true)}
                                    onMouseLeave={() => setIsListFollowupsTooltipVisible(false)}
                                    style={{
                                      border: 'none',
                                      background: 'transparent',
                                      padding: 0,
                                      cursor: 'help',
                                      display: 'inline-flex',
                                      alignItems: 'center'
                                    }}
                                    aria-label="Informação sobre envio da lista"
                                  >
                                    <AlertCircle size={14} color="#6b7280" />
                                  </button>
                                  {isListFollowupsTooltipVisible ? (
                                    <div
                                      style={{
                                        position: 'absolute',
                                        bottom: '100%',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        marginBottom: 8,
                                        background: '#1f2937',
                                        color: '#ffffff',
                                        padding: '8px 12px',
                                        borderRadius: 6,
                                        fontSize: 12,
                                        fontWeight: 600,
                                        whiteSpace: 'nowrap',
                                        zIndex: 1000,
                                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                                      }}
                                    >
                                      Enviada às 7 da manhã
                                      <div
                                        style={{
                                          position: 'absolute',
                                          top: '100%',
                                          left: '50%',
                                          transform: 'translateX(-50%)',
                                          width: 0,
                                          height: 0,
                                          borderLeft: '6px solid transparent',
                                          borderRight: '6px solid transparent',
                                          borderTop: '6px solid #1f2937'
                                        }}
                                      />
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>

                            <div style={{ display: 'inline-flex', justifyContent: 'center' }}>
                              {preference.id !== 'followup-list' && renderChannelSwitch(
                                preference.id,
                                'inApp',
                                preference.channels.inApp
                              )}
                            </div>
                            <div style={{ display: 'inline-flex', justifyContent: 'center' }}>
                              {renderChannelSwitch(
                                preference.id,
                                'whatsApp',
                                preference.channels.whatsApp
                              )}
                            </div>
                            <div style={{ display: 'inline-flex', justifyContent: 'center' }}>
                              {preference.id !== 'new-message' && renderChannelSwitch(
                                preference.id,
                                'email',
                                preference.channels.email
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                        </>
                      )}
                    </div>
                  ) : null}

                  {selectedNotificationsTab === 'canais' ? (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {isLoadingNotifications ? (
                        <div style={{ padding: '12px 16px', color: '#666', fontSize: 14 }}>
                          Carregando dados de notificações...
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '12px 16px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                          <div>
                            <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.2px' }}>
                              Números de WhatsApp
                            </div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#5b5b5b', marginTop: 4 }}>
                              Gerencie os números que irão receber notificações via WhatsApp
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsAddingWhatsAppNumber(true)}
                            style={{
                              padding: '8px 14px',
                              borderRadius: 8,
                              background: '#2f8f55',
                              color: '#ffffff',
                              fontSize: 14,
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 6,
                              border: 'none',
                              whiteSpace: 'nowrap',
                              flexShrink: 0
                            }}
                          >
                            + Adicionar número
                          </button>
                        </div>
                      </div>

                      <div style={{ padding: '12px 16px' }}>
                        {isAddingWhatsAppNumber ? (
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: hideMobileNotificationIcons ? '1fr auto auto' : 'auto 1fr auto auto',
                              alignItems: 'center',
                              gap: 12,
                              padding: '12px 0',
                              borderBottom: '1px solid #e5e7eb'
                            }}
                          >
                            {!hideMobileNotificationIcons ? (
                              <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                                <MessageCircle size={20} color="#2f8f55" />
                              </div>
                            ) : null}
                            <input
                              type="text"
                              value={newWhatsAppNumber}
                              onChange={(e) => setNewWhatsAppNumber(formatWhatsAppInputNumber(e.target.value))}
                              placeholder="(00)00000-0000"
                              maxLength={14}
                              style={{
                                fontSize: 14,
                                fontWeight: 600,
                                color: '#111827',
                                border: '1px solid #d1d5db',
                                borderRadius: 6,
                                padding: '6px 10px',
                                fontFamily: 'inherit'
                              }}
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={handleCancelAddWhatsAppNumber}
                              aria-label="Cancelar"
                              style={hideMobileNotificationIcons ? mobileNotificationActionTextStyle : {
                                border: 'none',
                                background: 'transparent',
                                color: '#6b7280',
                                cursor: 'pointer',
                                padding: 0,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              {hideMobileNotificationIcons ? 'Cancelar' : <X size={16} />}
                            </button>
                            <button
                              type="button"
                              onClick={handleConfirmAddWhatsAppNumber}
                              disabled={!isValidWhatsAppNumber(newWhatsAppNumber)}
                              aria-label="Confirmar"
                              style={hideMobileNotificationIcons ? {
                                ...mobileNotificationActionTextStyle,
                                color: isValidWhatsAppNumber(newWhatsAppNumber) ? '#2f8f55' : '#d1d5db',
                                cursor: isValidWhatsAppNumber(newWhatsAppNumber) ? 'pointer' : 'not-allowed'
                              } : {
                                border: 'none',
                                background: 'transparent',
                                color: isValidWhatsAppNumber(newWhatsAppNumber) ? '#2f8f55' : '#d1d5db',
                                cursor: isValidWhatsAppNumber(newWhatsAppNumber) ? 'pointer' : 'not-allowed',
                                padding: 0,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              {hideMobileNotificationIcons ? 'Salvar' : <Check size={16} />}
                            </button>
                          </div>
                        ) : null}
                        {whatsAppNumbers.map((item, index) => (
                          <div key={item.id}>
                            {editingWhatsAppNumberId === item.id ? (
                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: hideMobileNotificationIcons ? '1fr auto auto' : 'auto 1fr auto auto',
                                  alignItems: 'center',
                                  gap: 12,
                                  padding: '12px 0'
                                }}
                              >
                                {!hideMobileNotificationIcons ? (
                                  <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                                    <MessageCircle size={20} color="#2f8f55" />
                                  </div>
                                ) : null}
                                <input
                                  type="text"
                                  value={editingWhatsAppNumberValue}
                                  onChange={(e) => setEditingWhatsAppNumberValue(formatWhatsAppInputNumber(e.target.value))}
                                  placeholder="(00)00000-0000"
                                  style={{
                                    fontSize: 14,
                                    fontWeight: 600,
                                    color: '#111827',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: 4,
                                    padding: '8px 12px',
                                    fontFamily: 'inherit'
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={handleCancelEditWhatsAppNumber}
                                  aria-label="Cancelar"
                                  style={hideMobileNotificationIcons ? mobileNotificationActionTextStyle : {
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#6b7280',
                                    cursor: 'pointer',
                                    padding: 0,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  {hideMobileNotificationIcons ? 'Cancelar' : <X size={16} />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleConfirmEditWhatsAppNumber(item.id)}
                                  disabled={!isValidWhatsAppNumber(editingWhatsAppNumberValue)}
                                  aria-label="Confirmar"
                                  style={hideMobileNotificationIcons ? {
                                    ...mobileNotificationActionTextStyle,
                                    color: isValidWhatsAppNumber(editingWhatsAppNumberValue) ? '#2f8f55' : '#d1d5db',
                                    cursor: isValidWhatsAppNumber(editingWhatsAppNumberValue) ? 'pointer' : 'not-allowed'
                                  } : {
                                    border: 'none',
                                    background: 'transparent',
                                    color: isValidWhatsAppNumber(editingWhatsAppNumberValue) ? '#2f8f55' : '#d1d5db',
                                    cursor: isValidWhatsAppNumber(editingWhatsAppNumberValue) ? 'pointer' : 'not-allowed',
                                    padding: 0,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  {hideMobileNotificationIcons ? 'Salvar' : <Check size={16} />}
                                </button>
                              </div>
                            ) : (
                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: hideMobileNotificationIcons ? '1fr auto auto' : 'auto 1fr auto auto',
                                  alignItems: 'center',
                                  gap: 12,
                                  padding: '12px 0'
                                }}
                              >
                                {!hideMobileNotificationIcons ? (
                                  <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                                    <MessageCircle size={20} color="#2f8f55" />
                                  </div>
                                ) : null}
                                <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                                  {formatWhatsAppNumber(item.number)}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleStartEditWhatsAppNumber(item.id, item.number)}
                                  aria-label="Editar"
                                  style={hideMobileNotificationIcons ? mobileNotificationActionTextStyle : {
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#6b7280',
                                    cursor: 'pointer',
                                    padding: 0,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  {hideMobileNotificationIcons ? 'Editar' : <Edit size={16} />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteWhatsAppNumber(item.id)}
                                  aria-label="Deletar"
                                  style={hideMobileNotificationIcons ? mobileNotificationActionTextStyle : {
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#6b7280',
                                    cursor: 'pointer',
                                    padding: 0,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  {hideMobileNotificationIcons ? 'Excluir' : <Trash2 size={16} />}
                                </button>
                              </div>
                            )}
                            {index < whatsAppNumbers.length - 1 ? (
                              <div style={{ height: '1px', background: '#e5e7eb' }} />
                            ) : null}
                          </div>
                        ))}
                      </div>
                        </>
                      )}
                    </div>
                  ) : null}

                  {selectedNotificationsTab === 'preferencias' ? (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '12px 16px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                          <div>
                            <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.2px' }}>
                              Endereços de E-mail
                            </div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#5b5b5b', marginTop: 4 }}>
                              Gerencie os endereços que irão receber notificações via e-mail
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsAddingEmailAddress(true)}
                            style={{
                              padding: '8px 14px',
                              borderRadius: 8,
                              background: '#2f8f55',
                              color: '#ffffff',
                              fontSize: 14,
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 6,
                              border: 'none',
                              whiteSpace: 'nowrap',
                              flexShrink: 0
                            }}
                          >
                            + Adicionar e-mail
                          </button>
                        </div>
                      </div>

                      <div style={{ padding: '12px 16px' }}>
                        {isAddingEmailAddress ? (
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: hideMobileNotificationIcons ? '1fr auto auto' : 'auto 1fr auto auto',
                              alignItems: 'center',
                              gap: 12,
                              padding: '12px 0'
                            }}
                          >
                            {!hideMobileNotificationIcons ? (
                              <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                                <Mail size={20} color="#2f8f55" />
                              </div>
                            ) : null}
                            <input
                              type="text"
                              value={newEmailAddress}
                              onChange={(e) => setNewEmailAddress(e.target.value)}
                              placeholder="mail@email.com"
                              style={{
                                fontSize: 14,
                                fontWeight: 600,
                                color: '#111827',
                                border: '1px solid #e5e7eb',
                                borderRadius: 4,
                                padding: '8px 12px',
                                fontFamily: 'inherit'
                              }}
                            />
                            <button
                              type="button"
                              onClick={handleCancelAddEmailAddress}
                              aria-label="Cancelar"
                              style={hideMobileNotificationIcons ? mobileNotificationActionTextStyle : {
                                border: 'none',
                                background: 'transparent',
                                color: '#6b7280',
                                cursor: 'pointer',
                                padding: 0,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              {hideMobileNotificationIcons ? 'Cancelar' : <X size={16} />}
                            </button>
                            <button
                              type="button"
                              onClick={handleConfirmAddEmailAddress}
                              disabled={!isValidEmail(newEmailAddress)}
                              aria-label="Confirmar"
                              style={hideMobileNotificationIcons ? {
                                ...mobileNotificationActionTextStyle,
                                color: isValidEmail(newEmailAddress) ? '#2f8f55' : '#d1d5db',
                                cursor: isValidEmail(newEmailAddress) ? 'pointer' : 'not-allowed'
                              } : {
                                border: 'none',
                                background: 'transparent',
                                color: isValidEmail(newEmailAddress) ? '#2f8f55' : '#d1d5db',
                                cursor: isValidEmail(newEmailAddress) ? 'pointer' : 'not-allowed',
                                padding: 0,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              {hideMobileNotificationIcons ? 'Salvar' : <Check size={16} />}
                            </button>
                          </div>
                        ) : null}
                        {emailAddresses.map((item, index) => (
                          <div key={item.id}>
                            {editingEmailAddressId === item.id ? (
                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: hideMobileNotificationIcons ? '1fr auto auto' : 'auto 1fr auto auto',
                                  alignItems: 'center',
                                  gap: 12,
                                  padding: '12px 0'
                                }}
                              >
                                {!hideMobileNotificationIcons ? (
                                  <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                                    <Mail size={20} color="#2f8f55" />
                                  </div>
                                ) : null}
                                <input
                                  type="text"
                                  value={editingEmailAddressValue}
                                  onChange={(e) => setEditingEmailAddressValue(e.target.value)}
                                  placeholder="mail@email.com"
                                  style={{
                                    fontSize: 14,
                                    fontWeight: 600,
                                    color: '#111827',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: 4,
                                    padding: '8px 12px',
                                    fontFamily: 'inherit'
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={handleCancelEditEmailAddress}
                                  aria-label="Cancelar"
                                  style={hideMobileNotificationIcons ? mobileNotificationActionTextStyle : {
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#6b7280',
                                    cursor: 'pointer',
                                    padding: 0,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  {hideMobileNotificationIcons ? 'Cancelar' : <X size={16} />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleConfirmEditEmailAddress(item.id)}
                                  disabled={!isValidEmail(editingEmailAddressValue)}
                                  aria-label="Confirmar"
                                  style={hideMobileNotificationIcons ? {
                                    ...mobileNotificationActionTextStyle,
                                    color: isValidEmail(editingEmailAddressValue) ? '#2f8f55' : '#d1d5db',
                                    cursor: isValidEmail(editingEmailAddressValue) ? 'pointer' : 'not-allowed'
                                  } : {
                                    border: 'none',
                                    background: 'transparent',
                                    color: isValidEmail(editingEmailAddressValue) ? '#2f8f55' : '#d1d5db',
                                    cursor: isValidEmail(editingEmailAddressValue) ? 'pointer' : 'not-allowed',
                                    padding: 0,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  {hideMobileNotificationIcons ? 'Salvar' : <Check size={16} />}
                                </button>
                              </div>
                            ) : (
                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: hideMobileNotificationIcons ? '1fr auto auto' : 'auto 1fr auto auto',
                                  alignItems: 'center',
                                  gap: 12,
                                  padding: '12px 0'
                                }}
                              >
                                {!hideMobileNotificationIcons ? (
                                  <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                                    <Mail size={20} color="#2f8f55" />
                                  </div>
                                ) : null}
                                <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                                  {item.email}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleStartEditEmailAddress(item.id, item.email)}
                                  aria-label="Editar"
                                  style={hideMobileNotificationIcons ? mobileNotificationActionTextStyle : {
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#6b7280',
                                    cursor: 'pointer',
                                    padding: 0,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  {hideMobileNotificationIcons ? 'Editar' : <Edit size={16} />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteEmailAddress(item.id)}
                                  aria-label="Deletar"
                                  style={hideMobileNotificationIcons ? mobileNotificationActionTextStyle : {
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#6b7280',
                                    cursor: 'pointer',
                                    padding: 0,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  {hideMobileNotificationIcons ? 'Excluir' : <Trash2 size={16} />}
                                </button>
                              </div>
                            )}
                            {index < emailAddresses.length - 1 ? (
                              <div style={{ height: '1px', background: '#e5e7eb' }} />
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </aside>
        ) : null}

        {isMobile ? (
          <>
            {isMobileMenuOpen ? (
              <button
                type="button"
                aria-label="Fechar menu móvel"
                onClick={() => setIsMobileMenuOpen(false)}
                style={{
                  position: 'fixed',
                  inset: 0,
                  zIndex: 70,
                  border: 'none',
                  padding: 0,
                  margin: 0,
                  background: 'rgba(15, 23, 42, 0.3)'
                }}
              />
            ) : null}

            <aside
              aria-label="Mais opções"
              style={{
                position: 'fixed',
                left: 0,
                right: 0,
                bottom: mobileBottomNavOffset,
                zIndex: 80,
                background: '#fcfdff',
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                borderTop: sidebarBorder,
                boxShadow: '0 -16px 40px rgba(15, 23, 42, 0.18)',
                padding: '16px 20px 28px',
                transform: isMobileMenuOpen ? 'translateY(0)' : 'translateY(100%)',
                transition: 'transform 160ms ease'
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 4,
                  borderRadius: 999,
                  background: '#cbd5e1',
                  margin: '0 auto 16px'
                }}
              />

              <div style={{ display: 'grid', gap: 8 }}>
                <NavLink
                  to="/arquivos"
                  onClick={() => {
                    setIsMobileMenuOpen(false)
                    setIsSettingsPanelOpen(false)
                  }}
                  style={({ isActive }) => ({
                    ...navItemStyle(isSettingsPanelOpen ? false : isActive, hoveredNavKey === 'arquivos-mobile', false),
                    justifyContent: 'flex-start',
                    minHeight: 48,
                    padding: '12px 14px'
                  })}
                  onMouseEnter={() => setHoveredNavKey('arquivos-mobile')}
                  onMouseLeave={() => setHoveredNavKey(null)}
                >
                  <FileText size={18} />
                  <span style={{ marginLeft: 10 }}>Arquivos</span>
                </NavLink>

                <NavLink
                  to="/arquivados"
                  onClick={() => {
                    setIsMobileMenuOpen(false)
                    setIsSettingsPanelOpen(false)
                  }}
                  style={({ isActive }) => ({
                    ...navItemStyle(isSettingsPanelOpen ? false : isActive, hoveredNavKey === 'arquivados-mobile', false),
                    justifyContent: 'flex-start',
                    minHeight: 48,
                    padding: '12px 14px'
                  })}
                  onMouseEnter={() => setHoveredNavKey('arquivados-mobile')}
                  onMouseLeave={() => setHoveredNavKey(null)}
                >
                  <Archive size={18} />
                  <span style={{ marginLeft: 10 }}>Leads Arquivados</span>
                </NavLink>

                <NavLink
                  to="/financeiro"
                  onClick={() => {
                    setIsMobileMenuOpen(false)
                    setIsSettingsPanelOpen(false)
                  }}
                  style={({ isActive }) => ({
                    ...navItemStyle(isSettingsPanelOpen ? false : isActive, hoveredNavKey === 'financeiro-mobile', false),
                    justifyContent: 'flex-start',
                    minHeight: 48,
                    padding: '12px 14px'
                  })}
                  onMouseEnter={() => setHoveredNavKey('financeiro-mobile')}
                  onMouseLeave={() => setHoveredNavKey(null)}
                >
                  <CircleDollarSign size={18} />
                  <span style={{ marginLeft: 10 }}>Financeiro</span>
                </NavLink>

                <button
                  type="button"
                  style={{
                    ...navItemStyle(isSettingsPanelOpen, hoveredNavKey === 'configuracoes-mobile', false),
                    justifyContent: 'flex-start',
                    minHeight: 48,
                    padding: '12px 14px',
                    fontFamily: 'inherit',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={() => setHoveredNavKey('configuracoes-mobile')}
                  onMouseLeave={() => setHoveredNavKey(null)}
                  onClick={handleOpenSettingsPanel}
                >
                  <Settings size={18} />
                  <span style={{ marginLeft: 10 }}>Configurações</span>
                </button>

                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  style={{
                    ...navItemStyle(false, hoveredNavKey === 'logout-mobile', false),
                    justifyContent: 'flex-start',
                    minHeight: 48,
                    padding: '12px 14px',
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    width: '100%'
                  }}
                  onMouseEnter={() => setHoveredNavKey('logout-mobile')}
                  onMouseLeave={() => setHoveredNavKey(null)}
                >
                  <LogOut size={18} />
                  <span style={{ marginLeft: 10 }}>Logout</span>
                </button>
              </div>
            </aside>

            <nav
              aria-label="Navegação principal móvel"
              style={{
                position: 'fixed',
                left: 0,
                right: 0,
                bottom: mobileBottomNavBottomInset,
                zIndex: 90,
                height: mobileBottomNavHeight,
                background: '#fcfdff',
                borderTop: sidebarBorder,
                boxShadow: '0 -10px 18px -12px rgba(148, 163, 184, 0.36)',
                padding: '8px 12px'
              }}
            >
              <ul
                style={{
                  listStyle: 'none',
                  margin: 0,
                  padding: 0,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
                  alignItems: 'stretch',
                  gap: 6
                }}
              >
                <li>
                  <NavLink
                    to="/inicio"
                    onClick={() => {
                      setIsMobileHomeNotificationsOpen(false)
                      setIsMobileMenuOpen(false)
                      setIsSettingsPanelOpen(false)
                    }}
                    style={({ isActive }) => ({
                      ...navItemStyle(
                        isMobileHomeNotificationsOpen
                          ? false
                          : isMobileMenuOpen
                            ? false
                            : isSettingsPanelOpen
                              ? false
                              : isActive,
                        hoveredNavKey === 'inicio-mobile',
                        true
                      ),
                      minHeight: 58,
                      padding: '8px 6px'
                    })}
                    onMouseEnter={() => setHoveredNavKey('inicio-mobile')}
                    onMouseLeave={() => setHoveredNavKey(null)}
                  >
                    <Home size={18} />
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/leads"
                    onClick={() => {
                      setIsMobileHomeNotificationsOpen(false)
                      setIsMobileMenuOpen(false)
                      setIsSettingsPanelOpen(false)
                    }}
                    style={({ isActive }) => ({
                      ...navItemStyle(
                        isMobileMenuOpen ? false : isSettingsPanelOpen ? false : isActive,
                        hoveredNavKey === 'leads-mobile',
                        true
                      ),
                      minHeight: 58,
                      padding: '8px 6px'
                    })}
                    onMouseEnter={() => setHoveredNavKey('leads-mobile')}
                    onMouseLeave={() => setHoveredNavKey(null)}
                  >
                    <Users size={18} />
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/negocios"
                    onClick={() => {
                      setIsMobileHomeNotificationsOpen(false)
                      setIsMobileMenuOpen(false)
                      setIsSettingsPanelOpen(false)
                    }}
                    style={({ isActive }) => ({
                      ...navItemStyle(
                        isMobileMenuOpen ? false : isSettingsPanelOpen ? false : isActive,
                        hoveredNavKey === 'negocios-mobile',
                        true
                      ),
                      minHeight: 58,
                      padding: '8px 6px'
                    })}
                    onMouseEnter={() => setHoveredNavKey('negocios-mobile')}
                    onMouseLeave={() => setHoveredNavKey(null)}
                  >
                    <Briefcase size={18} />
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/agenda"
                    onClick={() => {
                      setIsMobileHomeNotificationsOpen(false)
                      setIsMobileMenuOpen(false)
                      setIsSettingsPanelOpen(false)
                    }}
                    style={({ isActive }) => ({
                      ...navItemStyle(
                        isMobileMenuOpen ? false : isSettingsPanelOpen ? false : isActive,
                        hoveredNavKey === 'agenda-mobile',
                        true
                      ),
                      minHeight: 58,
                      padding: '8px 6px'
                    })}
                    onMouseEnter={() => setHoveredNavKey('agenda-mobile')}
                    onMouseLeave={() => setHoveredNavKey(null)}
                  >
                    <CalendarClock size={18} />
                  </NavLink>
                </li>
                <li>
                  <button
                    type="button"
                    aria-label="Abrir mais opções"
                    onClick={() => setIsMobileMenuOpen((currentState) => !currentState)}
                    style={{
                      ...navItemStyle(false, hoveredNavKey === 'mais-mobile' || isMobileMenuOpen, true),
                      minHeight: 58,
                      padding: '8px 6px',
                      border: 'none',
                      fontFamily: 'inherit',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={() => setHoveredNavKey('mais-mobile')}
                    onMouseLeave={() => setHoveredNavKey(null)}
                  >
                    <MoreHorizontal size={18} />
                  </button>
                </li>
              </ul>
            </nav>
          </>
        ) : null}
      </section>
    </main>
  )
}
