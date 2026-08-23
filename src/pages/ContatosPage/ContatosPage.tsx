import { Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

import { interactionTheme } from '../../app/theme/brandTheme'
import { useViewportBreakpoint } from '../../app/theme/useViewportBreakpoint'
import { ContactDetailsSkeleton } from '../../core/components/ContactDetailsSkeleton'
import { DesktopTableSkeleton } from '../../core/components/DesktopTableSkeleton'
import { MobileListSkeleton } from '../../core/components/MobileListSkeleton'
import { TotalCount } from '../../core/components/TotalCount'
import {
  formatLeadPhoneInput,
  formatStoredLeadPhoneInput,
  isLeadPhoneComplete,
  toPersistedLeadPhone
} from '../../core/utils/leadPhone'
import { ContactsService } from '../../features/contacts/services/ContactsService'
import type { Contact } from '../../features/contacts/types/contacts.types'

type ContactSortKey = 'name' | 'phone' | 'company' | 'instagram'
type ContactSortDirection = 'asc' | 'desc'

const actionButtonStyle = {
  height: 32,
  width: 32,
  border: '1px solid #e5e7eb',
  borderRadius: 6,
  background: '#ffffff',
  color: '#4b5563',
  padding: 0,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center'
} as const

const formatInstagramHandle = (value: string | null | undefined) =>
  (value ?? '').replace(/^@+/, '')

const formatInstagramDisplay = (value: string | null | undefined) =>
  value ? `@${formatInstagramHandle(value)}` : '-'

const InstagramTag = ({ value }: { value: string | null | undefined }) => {
  if (!value) {
    return <span style={{ color: '#6b7280' }}>-</span>
  }

  return (
    <span
      style={{
        maxWidth: '100%',
        padding: '6px 10px',
        border: 'none',
        borderRadius: 6,
        background: '#fdf2f8',
        color: '#9d174d',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        boxSizing: 'border-box',
        fontSize: 12,
        fontWeight: 700,
        lineHeight: 1.1
      }}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {formatInstagramDisplay(value)}
      </span>
    </span>
  )
}

export default function ContatosPage() {
  const contactPanelWidth = 'min(48vw, 760px)'
  const contactPanelTransitionMs = 120
  const { isMobile } = useViewportBreakpoint()
  const navigate = useNavigate()
  const location = useLocation()
  const { contactId } = useParams<{ contactId?: string }>()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContactDetails, setSelectedContactDetails] = useState<Contact | null>(null)
  const [isContactDetailsLoading, setIsContactDetailsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [sortKey, setSortKey] = useState<ContactSortKey>('name')
  const [sortDirection, setSortDirection] = useState<ContactSortDirection>('asc')
  const [isSearchInputFocused, setIsSearchInputFocused] = useState(false)
  const [isAddButtonHovered, setIsAddButtonHovered] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isContactPanelEntering, setIsContactPanelEntering] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isEditingSelectedContact, setIsEditingSelectedContact] = useState(false)
  const [isConfirmingPanelDelete, setIsConfirmingPanelDelete] = useState(false)
  const [hoveredContactId, setHoveredContactId] = useState<string | null>(null)
  const [confirmingDeleteContactId, setConfirmingDeleteContactId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [instagram, setInstagram] = useState('')
  const selectedContact = contactId
    ? selectedContactDetails ?? contacts.find((contact) => contact.id === contactId) ?? null
    : null
  const isViewingSelectedContact = Boolean(contactId && !isCreateModalOpen)
  const isContactPanelOpen = isCreateModalOpen || Boolean(contactId)

  const loadContacts = async () => {
    try {
      setIsLoading(true)
      setContacts(await ContactsService.getContacts())
    } catch {
      return
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadContacts()
  }, [])

  useEffect(() => {
    if (!contactId) {
      setSelectedContactDetails(null)
      setIsContactDetailsLoading(false)
      return
    }

    let isMounted = true
    setSelectedContactDetails(null)
    setIsContactDetailsLoading(true)

    void ContactsService.getContact(contactId)
      .then((contact) => {
        if (!isMounted) return

        setSelectedContactDetails(contact)
        setContacts((currentContacts) => {
          const hasContact = currentContacts.some((currentContact) => currentContact.id === contact.id)
          return hasContact
            ? currentContacts.map((currentContact) =>
                currentContact.id === contact.id ? contact : currentContact
              )
            : [contact, ...currentContacts]
        })
      })
          .catch(() => undefined)
      .finally(() => {
        if (isMounted) {
          setIsContactDetailsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [contactId])

  useEffect(() => {
    if (!isContactPanelOpen || isMobile) {
      setIsContactPanelEntering(false)
      return
    }

    setIsContactPanelEntering(false)
    const animationFrameId = window.requestAnimationFrame(() => {
      setIsContactPanelEntering(true)
    })

    return () => {
      window.cancelAnimationFrame(animationFrameId)
    }
  }, [isContactPanelOpen, isMobile])

  useEffect(() => {
    if (!selectedContact || isCreateModalOpen) {
      return
    }

    setName(selectedContact.name)
    setPhone(formatStoredLeadPhoneInput(selectedContact.phone))
    setCompany(selectedContact.company ?? '')
    setInstagram(formatInstagramHandle(selectedContact.instagram))
    setIsEditingSelectedContact(false)
    setIsConfirmingPanelDelete(false)
  }, [isCreateModalOpen, selectedContact])

  const normalizedSearchTerm = searchTerm.trim().toLocaleLowerCase('pt-BR')
  const filteredContacts = contacts.filter((contact) =>
    contact.name.toLocaleLowerCase('pt-BR').includes(normalizedSearchTerm)
  )
  const sortedFilteredContacts = [...filteredContacts].sort((firstContact, secondContact) => {
    const directionFactor = sortDirection === 'asc' ? 1 : -1
    const getSortValue = (contact: Contact) => {
      if (sortKey === 'phone') {
        return contact.phone
      }

      if (sortKey === 'company') {
        return contact.company ?? ''
      }

      if (sortKey === 'instagram') {
        return formatInstagramHandle(contact.instagram)
      }

      return contact.name
    }

    return getSortValue(firstContact).localeCompare(getSortValue(secondContact), 'pt-BR', {
      numeric: sortKey === 'phone',
      sensitivity: 'base'
    }) * directionFactor
  })
  const canCreateContact = Boolean(name.trim() && isLeadPhoneComplete(phone))
  const isContactFormReadOnly = isViewingSelectedContact && !isEditingSelectedContact
  const contactFieldLabelStyle = {
    color: '#1f2937',
    fontSize: isMobile ? 17 / 1.3 : 13,
    fontWeight: 700
  } as const
  const contactInputStyle = {
    width: '100%',
    height: isMobile ? 46 : 42,
    border: '1px solid #d7dce4',
    borderRadius: 10,
    padding: '0 14px',
    color: isContactFormReadOnly ? '#64748b' : '#111827',
    background: isContactFormReadOnly ? '#f8fafc' : '#ffffff',
    outline: 'none',
    fontSize: isMobile ? 17 / 1.2 : 14,
    boxSizing: 'border-box',
    cursor: isContactFormReadOnly ? 'not-allowed' : 'text'
  } as const

  const handleSortToggle = (nextSortKey: ContactSortKey) => {
    if (sortKey === nextSortKey) {
      setSortDirection((currentDirection) => currentDirection === 'asc' ? 'desc' : 'asc')
      return
    }

    setSortKey(nextSortKey)
    setSortDirection('asc')
  }

  const getSortIndicator = (targetSortKey: ContactSortKey) => {
    if (sortKey !== targetSortKey) {
      return '↕'
    }

    return sortDirection === 'asc' ? '↑' : '↓'
  }

  const getHeaderSortButtonStyle = (targetSortKey: ContactSortKey) => ({
    border: 'none',
    background: 'transparent',
    padding: 0,
    color: '#4b5563',
    fontSize: 13,
    fontWeight: sortKey === targetSortKey ? 700 : 600,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6
  } as const)

  const closeCreateModal = () => {
    if (isSaving) {
      return
    }

    setIsCreateModalOpen(false)
    setIsEditingSelectedContact(false)
    setIsConfirmingPanelDelete(false)
    setName('')
    setPhone('')
    setCompany('')
    setInstagram('')
    if (contactId) {
      navigate(`/contatos${location.search}`)
    }
  }

  const handleCloseContactPanel = () => {
    if (isEditingSelectedContact && selectedContact) {
      setName(selectedContact.name)
      setPhone(formatStoredLeadPhoneInput(selectedContact.phone))
      setCompany(selectedContact.company ?? '')
      setInstagram(formatInstagramHandle(selectedContact.instagram))
      setIsEditingSelectedContact(false)
      return
    }

    closeCreateModal()
  }

  const openCreateContact = () => {
    if (contactId) {
      navigate(`/contatos${location.search}`)
    }
    setName('')
    setPhone('')
    setCompany('')
    setInstagram('')
    setIsCreateModalOpen(true)
  }

  const handleCreateContact = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedName = name.trim()
    const instagramHandle = formatInstagramHandle(instagram.trim()).trim()
    if (!trimmedName) {
      return
    }

    if (!isLeadPhoneComplete(phone)) {
      return
    }

    try {
      setIsSaving(true)
      const contactPayload = {
        name: trimmedName,
        phone: toPersistedLeadPhone(phone),
        company: company.trim(),
        instagram: instagramHandle ? `@${instagramHandle}` : ''
      }

      if (isEditingSelectedContact && selectedContact) {
        const updatedContact = await ContactsService.updateContact(
          selectedContact.id,
          contactPayload
        )
        setContacts((currentContacts) =>
          currentContacts.map((contact) =>
            contact.id === updatedContact.id ? updatedContact : contact
          )
        )
        setIsEditingSelectedContact(false)
        return
      } else {
        const createdContact = await ContactsService.createContact(contactPayload)
        setContacts((currentContacts) => [createdContact, ...currentContacts])
      }

      setIsCreateModalOpen(false)
      setName('')
      setPhone('')
      setCompany('')
      setInstagram('')
      if (contactId) {
        navigate(`/contatos${location.search}`)
      }
    } catch {
      return
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteContact = async (deletedContactId: string) => {
    try {
      await ContactsService.deleteContact(deletedContactId)
      setContacts((currentContacts) =>
        currentContacts.filter((contact) => contact.id !== deletedContactId)
      )
      setConfirmingDeleteContactId(null)
      setIsConfirmingPanelDelete(false)
      if (contactId === deletedContactId) {
        navigate(`/contatos${location.search}`)
      }
    } catch {
      return
    }
  }

  const renderEmptyState = () => (
    <div
      style={{
        padding: 16,
        color: '#6b7280',
        fontSize: 14,
        textAlign: 'center'
      }}
    >
      Nenhum contato encontrado.
    </div>
  )

  const createContactForm = (
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-contact-title"
      style={{
        width: '100%',
        height: '100%',
        minHeight: 0,
        background: '#ffffff',
        borderRadius: 0,
        padding: isMobile ? '22px 18px 28px' : 24,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        overflow: 'hidden'
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: isMobile ? 16 : 12 }}>
        <h2
          id="create-contact-title"
          style={{
            margin: 0,
            color: isMobile ? '#111827' : '#0f172a',
            fontSize: isMobile ? 24 : 26,
            fontWeight: isMobile ? 700 : 800,
            lineHeight: 1
          }}
        >
          {isViewingSelectedContact
            ? selectedContact?.name
            : isMobile
              ? 'Adicionar Contato'
              : 'Novo contato'}
        </h2>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {!isViewingSelectedContact ? (
            <button
              type="submit"
              form="contact-form"
              aria-label="Salvar contato"
              title="Salvar contato"
              disabled={isSaving || !canCreateContact}
              style={{ width: 32, height: 32, border: 'none', borderRadius: 6, background: 'transparent', color: canCreateContact ? '#6b7280' : '#cbd5e1', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0, cursor: canCreateContact ? 'pointer' : 'not-allowed' }}
            >
              <Save size={18} />
            </button>
          ) : !isConfirmingPanelDelete ? (
            isEditingSelectedContact ? (
              <button
                type="submit"
                form="contact-form"
                aria-label="Salvar contato"
                title="Salvar contato"
                disabled={isSaving || !canCreateContact}
                style={{ width: 32, height: 32, border: 'none', borderRadius: 6, background: 'transparent', color: canCreateContact ? '#6b7280' : '#cbd5e1', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0, cursor: canCreateContact ? 'pointer' : 'not-allowed' }}
              >
                <Save size={18} />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  aria-label="Editar contato"
                  title="Editar contato"
                  onClick={() => setIsEditingSelectedContact(true)}
                  style={{ width: 32, height: 32, border: 'none', borderRadius: 6, background: 'transparent', color: '#6b7280', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0, cursor: 'pointer' }}
                >
                  <Pencil size={18} />
                </button>
                <button
                  type="button"
                  aria-label="Excluir contato aberto"
                  title="Excluir contato"
                  onClick={() => setIsConfirmingPanelDelete(true)}
                  style={{ width: 32, height: 32, border: 'none', borderRadius: 6, background: 'transparent', color: '#6b7280', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0, cursor: 'pointer' }}
                >
                  <Trash2 size={18} />
                </button>
              </>
            )
          ) : null}
          <button
            type="button"
            aria-label="Fechar criação de contato"
            title={isEditingSelectedContact ? 'Cancelar edição' : 'Fechar'}
            onClick={handleCloseContactPanel}
            style={isMobile
              ? { ...actionButtonStyle, border: 'none' }
              : {
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
            {isMobile ? <X size={19} /> : 'X'}
          </button>
        </div>
      </header>

      {!isMobile ? <div style={{ borderBottom: '1px solid #e5e7eb' }} /> : null}

      {isViewingSelectedContact && isConfirmingPanelDelete ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 16px', background: interactionTheme.clickableCardHoverBackground, borderRadius: 8 }}>
          <strong style={{ color: '#111827', fontSize: 14 }}>Deletar Contato?</strong>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button type="button" aria-label="Cancelar exclusão do contato aberto" onClick={() => setIsConfirmingPanelDelete(false)} style={actionButtonStyle}>X</button>
            <button type="button" aria-label="Confirmar exclusão do contato aberto" onClick={() => selectedContact && void handleDeleteContact(selectedContact.id)} style={actionButtonStyle}>✓</button>
          </div>
        </div>
      ) : null}

      <form
        id="contact-form"
        onSubmit={(event) => void handleCreateContact(event)}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: isMobile ? 16 : 18,
          marginTop: 0,
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingRight: isMobile ? 2 : 6,
          boxSizing: 'border-box'
        }}
      >
        <label style={{ display: 'grid', gap: 8 }}>
          <span style={contactFieldLabelStyle}>
            Nome
          </span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nome do contato"
            autoComplete="new-password"
            disabled={isSaving || (isViewingSelectedContact && !isEditingSelectedContact)}
            style={contactInputStyle}
          />
        </label>

        <label style={{ display: 'grid', gap: 8 }}>
          <span style={contactFieldLabelStyle}>
            Telefone
          </span>
          <input
            type="text"
            value={phone}
            onChange={(event) => setPhone(formatLeadPhoneInput(event.target.value))}
            placeholder="Telefone do contato"
            autoComplete="new-password"
            maxLength={14}
            inputMode="numeric"
            disabled={isSaving || (isViewingSelectedContact && !isEditingSelectedContact)}
            style={contactInputStyle}
          />
        </label>

        <label style={{ display: 'grid', gap: 8 }}>
          <span style={contactFieldLabelStyle}>
            Empresa
          </span>
          <input
            type="text"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            placeholder="Empresa do contato"
            autoComplete="organization"
            disabled={isSaving || (isViewingSelectedContact && !isEditingSelectedContact)}
            style={contactInputStyle}
          />
        </label>

        <label style={{ display: 'grid', gap: 8 }}>
          <span style={contactFieldLabelStyle}>
            Instagram
          </span>
          <div style={{ position: 'relative' }}>
            <span
              aria-hidden="true"
              style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: isContactFormReadOnly ? '#64748b' : '#111827', fontSize: isMobile ? 17 / 1.2 : 14, pointerEvents: 'none', zIndex: 1 }}
            >
              @
            </span>
            <input
              type="text"
              value={instagram}
              onChange={(event) => setInstagram(formatInstagramHandle(event.target.value))}
              placeholder="Instagram do contato"
              autoComplete="off"
              disabled={isSaving || (isViewingSelectedContact && !isEditingSelectedContact)}
              style={{ ...contactInputStyle, paddingLeft: isMobile ? 30 : 28 }}
            />
          </div>
        </label>

      </form>
    </section>
  )

  const createModal = isCreateModalOpen && isMobile ? (
    <>
      <button
        type="button"
        aria-label="Fechar criação de contato"
        onClick={closeCreateModal}
        style={{
          position: 'absolute',
          inset: 0,
          border: 'none',
          background: 'rgba(15, 23, 42, 0.18)',
          zIndex: 40,
          cursor: 'default'
        }}
      />
      <aside
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          maxHeight: '86%',
          zIndex: 45,
          borderRadius: '22px 22px 0 0',
          background: '#ffffff',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 -18px 36px rgba(15, 23, 42, 0.18)'
        }}
      >
        {createContactForm}
      </aside>
    </>
  ) : null

  const selectedContactPanel = isViewingSelectedContact && isMobile ? (
    <aside
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 50,
        background: '#ffffff',
        overflow: 'hidden'
      }}
    >
      {isContactDetailsLoading || !selectedContact
        ? <ContactDetailsSkeleton isMobile />
        : createContactForm}
    </aside>
  ) : null

  if (isMobile) {
    return (
      <section style={{ height: '100%', padding: '24px 16px 16px', display: 'flex', flexDirection: 'column', gap: 18, background: '#fafbfd', boxSizing: 'border-box', position: 'relative', overflow: 'hidden' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <h1 style={{ margin: 0, fontSize: 32, color: '#111827', lineHeight: 1.1, fontWeight: 800 }}>Contatos</h1>
          <span style={{ width: 52, color: '#6b7280', fontSize: 13, fontWeight: 600, textAlign: 'center', whiteSpace: 'nowrap' }}>
            <TotalCount isLoading={isLoading} total={filteredContacts.length} />
          </span>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 52px', gap: 12 }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            onFocus={() => setIsSearchInputFocused(true)}
            onBlur={() => setIsSearchInputFocused(false)}
            placeholder="Buscar contato"
            style={{ width: '100%', height: 52, border: `1px solid ${isSearchInputFocused ? interactionTheme.inputFocusBorderColor : '#d1d5db'}`, borderRadius: 14, padding: '0 16px', background: '#ffffff', color: '#111827', boxShadow: isSearchInputFocused ? interactionTheme.inputFocusBoxShadow : 'none', outline: 'none', fontSize: 16, boxSizing: 'border-box' }}
          />
          <button type="button" aria-label="Adicionar contato" onClick={openCreateContact} style={{ height: 52, width: 52, border: 'none', borderRadius: 14, background: interactionTheme.primaryButtonBackground, color: '#ffffff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Plus size={26} />
          </button>
        </div>

        <div style={{ minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, paddingRight: 2 }}>
          {isLoading ? <MobileListSkeleton /> : null}
          {!isLoading && filteredContacts.length > 0
            ? filteredContacts.map((contact) => (
                <article
                  key={contact.id}
                  onClick={() => {
                    if (confirmingDeleteContactId !== contact.id) {
                      navigate(`/contatos/${contact.id}${location.search}`)
                    }
                  }}
                  style={{ background: confirmingDeleteContactId === contact.id ? interactionTheme.clickableCardHoverBackground : '#ffffff', border: '1px solid #f1f5f9', borderRadius: 18, boxShadow: '0 12px 26px rgba(15, 23, 42, 0.06)', padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, cursor: confirmingDeleteContactId === contact.id ? 'default' : 'pointer' }}
                >
                  {confirmingDeleteContactId === contact.id ? (
                    <>
                      <strong style={{ color: '#111827', fontSize: 15 }}>Deletar Contato?</strong>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button type="button" aria-label="Cancelar exclusão de contato" onClick={() => setConfirmingDeleteContactId(null)} style={actionButtonStyle}>X</button>
                        <button type="button" aria-label="Confirmar exclusão de contato" onClick={() => void handleDeleteContact(contact.id)} style={actionButtonStyle}>✓</button>
                      </div>
                    </>
                  ) : (
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <h2 style={{ margin: 0, minWidth: 0, flex: 1, color: '#111827', fontSize: 20, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{contact.name}</h2>
                        <button
                          type="button"
                          aria-label="Excluir contato"
                          onClick={(event) => {
                            event.stopPropagation()
                            setConfirmingDeleteContactId(contact.id)
                          }}
                          style={{ ...actionButtonStyle, height: 34, width: 34, borderRadius: 8, flexShrink: 0 }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <p style={{ margin: '8px 0 0', color: '#6b7280', fontSize: 14 }}>{formatStoredLeadPhoneInput(contact.phone)}</p>
                      {contact.company ? <p style={{ margin: '6px 0 0', color: '#6b7280', fontSize: 14 }}>{contact.company}</p> : null}
                      {contact.instagram ? <div style={{ marginTop: 8 }}><InstagramTag value={contact.instagram} /></div> : null}
                    </div>
                  )}
                </article>
              ))
            : !isLoading
              ? renderEmptyState()
              : null}
        </div>
        {createModal}
        {selectedContactPanel}
      </section>
    )
  }

  return (
    <section style={{ height: '100vh', padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 16, background: '#f3f4f6', boxSizing: 'border-box', position: 'relative', overflow: 'hidden' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '4px 2px' }}>
        <h1 style={{ margin: 0, color: '#111827', fontSize: 24, fontWeight: 700, lineHeight: 1.2 }}>Contatos</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            onFocus={() => setIsSearchInputFocused(true)}
            onBlur={() => setIsSearchInputFocused(false)}
            placeholder="Buscar Contato"
            style={{ width: 220, height: 38, border: `1px solid ${isSearchInputFocused ? interactionTheme.inputFocusBorderColor : '#d1d5db'}`, borderRadius: 8, padding: '0 12px', background: '#ffffff', color: '#111827', boxShadow: isSearchInputFocused ? interactionTheme.inputFocusBoxShadow : 'none', outline: 'none' }}
          />
          <button
            type="button"
            onMouseEnter={() => setIsAddButtonHovered(true)}
            onMouseLeave={() => setIsAddButtonHovered(false)}
            onClick={openCreateContact}
            style={{ height: 38, border: 'none', borderRadius: 8, background: isAddButtonHovered ? interactionTheme.primaryButtonHoverBackground : interactionTheme.primaryButtonBackground, color: '#ffffff', padding: '0 16px', fontWeight: 600, cursor: 'pointer' }}
          >
            Adicionar Contato
          </button>
        </div>
      </header>

      <div style={{ width: '100%', background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, overflowY: 'auto', minHeight: 0, boxShadow: '0 1px 2px rgba(16, 24, 40, 0.04)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#ffffff', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '26%' }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '22%' }} />
            <col style={{ width: '22%' }} />
            <col style={{ width: '10%' }} />
          </colgroup>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #ececec', background: '#f3f4f6' }}>
              <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f3f4f6', padding: '10px 12px', color: '#4b5563', fontSize: 13, fontWeight: 600 }}>
                <button type="button" onClick={() => handleSortToggle('name')} style={getHeaderSortButtonStyle('name')}>
                  Nome <span style={{ fontSize: 11 }}>{getSortIndicator('name')}</span>
                </button>
              </th>
              <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f3f4f6', padding: '10px 12px', color: '#4b5563', fontSize: 13, fontWeight: 600 }}>
                <button type="button" onClick={() => handleSortToggle('phone')} style={getHeaderSortButtonStyle('phone')}>
                  Telefone <span style={{ fontSize: 11 }}>{getSortIndicator('phone')}</span>
                </button>
              </th>
              <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f3f4f6', padding: '10px 12px', color: '#4b5563', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
                <button type="button" onClick={() => handleSortToggle('company')} style={getHeaderSortButtonStyle('company')}>
                  Empresa <span style={{ fontSize: 11 }}>{getSortIndicator('company')}</span>
                </button>
              </th>
              <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f3f4f6', padding: '10px 12px', color: '#4b5563', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
                <button type="button" onClick={() => handleSortToggle('instagram')} style={getHeaderSortButtonStyle('instagram')}>
                  Instagram <span style={{ fontSize: 11 }}>{getSortIndicator('instagram')}</span>
                </button>
              </th>
              <th style={{ position: 'sticky', top: 0, zIndex: 2, background: '#f3f4f6', padding: '10px 12px', color: '#4b5563', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <DesktopTableSkeleton
                columns={[
                  { width: '70%' },
                  { width: '66%' },
                  { width: '68%', align: 'center' },
                  { width: '64%', align: 'center' },
                  { width: 32, align: 'center' }
                ]}
              />
            ) : null}
            {!isLoading && sortedFilteredContacts.length > 0
              ? sortedFilteredContacts.map((contact) => (
                  <tr
                    key={contact.id}
                    onClick={() => {
                      if (confirmingDeleteContactId !== contact.id) {
                        navigate(`/contatos/${contact.id}${location.search}`)
                      }
                    }}
                    onMouseEnter={() => setHoveredContactId(contact.id)}
                    onMouseLeave={() => setHoveredContactId(null)}
                    style={{
                      borderBottom: '1px solid #f3f4f6',
                      background:
                        hoveredContactId === contact.id || contactId === contact.id
                          ? interactionTheme.clickableCardHoverBackground
                          : '#ffffff',
                      cursor: 'pointer'
                    }}
                  >
                    {confirmingDeleteContactId === contact.id ? (
                      <>
                        <td colSpan={4} style={{ padding: '14px 16px', color: '#2f2f2f', fontSize: 13, fontWeight: 600 }}>Deletar Contato?</td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
                            <button type="button" aria-label="Cancelar exclusão de contato" onClick={() => setConfirmingDeleteContactId(null)} style={{ ...actionButtonStyle, height: 24, width: 24, borderRadius: 4 }}>X</button>
                            <button type="button" aria-label="Confirmar exclusão de contato" onClick={() => void handleDeleteContact(contact.id)} style={{ ...actionButtonStyle, height: 24, width: 24, borderRadius: 4 }}>✓</button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ padding: '14px 12px', color: '#111827', fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contact.name}</td>
                        <td style={{ padding: '14px 12px', color: '#4b5563', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatStoredLeadPhoneInput(contact.phone)}</td>
                        <td style={{ padding: '14px 12px', color: '#4b5563', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>{contact.company || '-'}</td>
                        <td style={{ padding: '14px 12px', textAlign: 'center' }}><InstagramTag value={contact.instagram} /></td>
                        <td
                          style={{ padding: '10px 12px', textAlign: 'center' }}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <button
                            type="button"
                            aria-label="Excluir contato"
                            onClick={() => setConfirmingDeleteContactId(contact.id)}
                            style={{
                              height: 24,
                              width: 24,
                              border: 'none',
                              background: 'transparent',
                              color: '#4b5563',
                              padding: 0,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              : null}
            {!isLoading && filteredContacts.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '14px 16px', color: '#6b7280' }}>
                  Nenhum contato encontrado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginTop: -6,
          color: '#6b7280',
          fontSize: 13,
          padding: '0 8px'
        }}
      >
        <TotalCount isLoading={isLoading} total={filteredContacts.length} />
      </div>
      {isContactPanelOpen ? (
        <>
          <button
            type="button"
            aria-label="Fechar formulário de contato"
            onClick={closeCreateModal}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: contactPanelWidth,
              bottom: 0,
              zIndex: 20,
              border: 'none',
              padding: 0,
              margin: 0,
              background: 'transparent',
              cursor: 'default'
            }}
          />
          <aside
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              width: contactPanelWidth,
              zIndex: 30,
              borderLeft: '2px solid #edf1f5',
              background: '#ffffff',
              overflow: 'hidden',
              boxShadow: '-10px 0 18px -12px rgba(148, 163, 184, 0.36)',
              transform:
                isViewingSelectedContact || isContactPanelEntering
                  ? 'translateX(0)'
                  : 'translateX(100%)',
              transition: `transform ${contactPanelTransitionMs}ms ease`
            }}
          >
            {isViewingSelectedContact && (isContactDetailsLoading || !selectedContact)
              ? <ContactDetailsSkeleton isMobile={false} />
              : createContactForm}
          </aside>
        </>
      ) : null}
    </section>
  )
}
