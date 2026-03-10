import { create } from 'zustand'

export interface AuthUser {
  id: number
  username: string
  email: string
  avatar: string
  game_nick: string
  game_clan: string
  game_rank: string
}

interface AuthStore {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  setAuth: (user: AuthUser, access: string, refresh: string) => void
  updateUser: (user: AuthUser) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: JSON.parse(localStorage.getItem('auth_user') ?? 'null'),
  accessToken: localStorage.getItem('auth_access') ?? null,
  refreshToken: localStorage.getItem('auth_refresh') ?? null,

  setAuth: (user, accessToken, refreshToken) => {
    localStorage.setItem('auth_user', JSON.stringify(user))
    localStorage.setItem('auth_access', accessToken)
    localStorage.setItem('auth_refresh', refreshToken)
    set({ user, accessToken, refreshToken })
  },

  updateUser: (user) => {
    localStorage.setItem('auth_user', JSON.stringify(user))
    set({ user })
  },

  logout: () => {
    localStorage.removeItem('auth_user')
    localStorage.removeItem('auth_access')
    localStorage.removeItem('auth_refresh')
    set({ user: null, accessToken: null, refreshToken: null })
  },
}))
