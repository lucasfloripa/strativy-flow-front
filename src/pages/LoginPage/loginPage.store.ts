import { atom } from 'jotai'

export const accessTokenAtom = atom<string | null>(null)
export const isLoginSubmittingAtom = atom<boolean>(false)
export const loginErrorAtom = atom<string | null>(null)