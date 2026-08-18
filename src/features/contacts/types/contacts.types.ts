export type Contact = {
  id: string
  name: string
  phone: string
  company: string | null
  instagram: string | null
  createdAt: string
  updatedAt: string
}

export type CreateContactInput = {
  name: string
  phone: string
  company?: string
  instagram?: string
}
