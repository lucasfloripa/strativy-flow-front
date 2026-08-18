import { appApiClient } from '../../../core/api/appApiClient'
import type { Contact, CreateContactInput } from '../types/contacts.types'

export const ContactsService = {
  async getContacts(): Promise<Contact[]> {
    const { data } = await appApiClient.get<Contact[]>('/contacts')
    return data
  },

  async createContact(contact: CreateContactInput): Promise<Contact> {
    const { data } = await appApiClient.post<Contact>('/contacts', contact)
    return data
  },

  async updateContact(
    contactId: string,
    contact: CreateContactInput
  ): Promise<Contact> {
    const { data } = await appApiClient.patch<Contact>(
      `/contacts/${contactId}`,
      contact
    )
    return data
  },

  async deleteContact(contactId: string): Promise<void> {
    await appApiClient.delete(`/contacts/${contactId}`)
  }
}
