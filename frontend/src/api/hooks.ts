import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import type { AuthUser } from '@/store/authStore'

// ── Auth fetch helper ───────────────────────────────────────────────────────

function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = useAuthStore.getState().accessToken
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> ?? {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return fetch(url, { ...options, headers })
}

// ── Types ───────────────────────────────────────────────────────────────────

export interface Item {
  name: string
  filename: string
  url: string
  color?: string
}

export interface ItemsResponse {
  marcas: Item[]
  insignias: Item[]
  fitas: Item[]
  patentes: Item[]
}

export interface BannerRecord {
  id: number
  nick: string
  clan: string
  marca: string
  insignia: string
  fita: string
  patente: string
  created_at: string
}

export interface SavePayload {
  nick: string
  clan: string
  marca: string
  insignia: string
  fita: string
  patente: string
}

// ── Auth types ──────────────────────────────────────────────────────────────

export interface AuthResponse {
  access: string
  refresh: string
  user: AuthUser
  recovery_code?: string
}

export interface RegisterPayload {
  username: string
  email: string
  password: string
  password2: string
  game_nick?: string
  game_clan?: string
  game_rank?: string
}

export interface LoginPayload {
  username: string
  password: string
}

export interface RecoverPayload {
  email: string
  code: string
  new_password: string
}

// ── Items query ─────────────────────────────────────────────────────────────

export function useItems() {
  return useQuery<ItemsResponse>({
    queryKey: ['items'],
    queryFn: () => fetch('/api/items/').then((r) => r.json()),
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  })
}

export function useMarcas() { return useItems().data?.marcas ?? [] }
export function useInsignias() { return useItems().data?.insignias ?? [] }
export function useFitas() { return useItems().data?.fitas ?? [] }
export function usePatentes() { return useItems().data?.patentes ?? [] }
export function useItemsLoading() { return useItems().isLoading }

// ── Backgrounds ─────────────────────────────────────────────────────────────

export interface BackgroundItem {
  name: string
  url: string
  type: 'image' | 'video'
}

export function useBackgrounds() {
  return useQuery<BackgroundItem[]>({
    queryKey: ['backgrounds'],
    queryFn: () => fetch('/api/backgrounds/').then((r) => r.json()),
    staleTime: Infinity,
  })
}

export interface GifItem {
  name: string
  url: string
}

// ── Community ────────────────────────────────────────────────────────────────

export interface CommunityBanner {
  id: number
  nick: string
  clan: string
  marca: string
  insignia: string
  fita: string
  patente: string
  created_at: string
  username: string
  avatar: string | null
}

interface CommunityPage {
  banners: CommunityBanner[]
  total: number
  has_more: boolean
}

export function useCommunityLatest() {
  return useQuery<CommunityBanner[]>({
    queryKey: ['community-latest'],
    queryFn: () => fetch('/api/community/latest/').then((r) => r.json()),
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  })
}

export function useCommunity() {
  return useInfiniteQuery<CommunityPage>({
    queryKey: ['community'],
    queryFn: ({ pageParam }) =>
      fetch(`/api/community/?page=${pageParam}`).then((r) => r.json()),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.has_more ? allPages.length + 1 : undefined,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  })
}

export function useGifs() {
  return useQuery<GifItem[]>({
    queryKey: ['gifs'],
    queryFn: () => fetch('/api/gifs/').then((r) => r.json()),
    staleTime: Infinity,
  })
}

// ── History ─────────────────────────────────────────────────────────────────

export function useHistory() {
  const token = useAuthStore((s) => s.accessToken)
  return useQuery<BannerRecord[]>({
    queryKey: ['history', !!token],
    queryFn: () => authFetch('/api/history/').then((r) => r.json()),
    staleTime: 10_000,
    enabled: !!token,
  })
}

// ── Save banner ─────────────────────────────────────────────────────────────

export function useSaveBanner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: SavePayload) =>
      authFetch('/api/history/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['history'] }),
  })
}

// ── Delete banner ───────────────────────────────────────────────────────────

export function useDeleteBanner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      authFetch(`/api/history/${id}/`, { method: 'DELETE' }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['history'] })
      const previous = qc.getQueryData<BannerRecord[]>(['history'])
      qc.setQueryData<BannerRecord[]>(['history'], (old) =>
        old?.filter((b) => b.id !== id) ?? []
      )
      return { previous }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(['history'], ctx.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['history'] }),
  })
}

// ── Auth mutations ──────────────────────────────────────────────────────────

export function useRegister() {
  return useMutation<AuthResponse, Error, RegisterPayload>({
    mutationFn: (payload) =>
      fetch('/api/auth/register/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error ?? 'Erro ao criar conta.')
        return data
      }),
  })
}

export function useLogin() {
  return useMutation<AuthResponse, Error, LoginPayload>({
    mutationFn: (payload) =>
      fetch('/api/auth/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error ?? 'Erro ao fazer login.')
        return data
      }),
  })
}

export function useRecover() {
  return useMutation<AuthResponse, Error, RecoverPayload>({
    mutationFn: (payload) =>
      fetch('/api/auth/recover/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error ?? 'Erro ao recuperar conta.')
        return data
      }),
  })
}

export function useDiscordAuthUrl() {
  return useQuery<{ url: string }>({
    queryKey: ['discord-auth-url'],
    queryFn: () => fetch('/api/auth/discord/').then((r) => r.json()),
    staleTime: Infinity,
  })
}

export interface UpdateProfilePayload {
  game_nick?: string
  game_clan?: string
  game_rank?: string
}

export function useUpdateProfile() {
  return useMutation<AuthUser, Error, UpdateProfilePayload>({
    mutationFn: (payload) =>
      authFetch('/api/auth/profile/', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error ?? 'Erro ao atualizar perfil.')
        return data
      }),
  })
}

export interface ChangePasswordPayload {
  current_password: string
  new_password: string
  confirm_password: string
}

export function useChangePassword() {
  return useMutation<{ ok: boolean }, Error, ChangePasswordPayload>({
    mutationFn: (payload) =>
      authFetch('/api/auth/change-password/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error ?? 'Erro ao alterar senha.')
        return data
      }),
  })
}
export interface UploadResponse {
  message: string
  ids: number[]
}

export function useUploadImages() {
  return useMutation<UploadResponse, Error, { files: File[], type?: string }>({
    mutationFn: ({ files, type }) => {
      const formData = new FormData()
      files.forEach((file) => formData.append('images', file))
      if (type) formData.append('type', type)

      return authFetch('/api/processar/upload/', {
        method: 'POST',
        body: formData,
      }).then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error ?? 'Erro ao enviar imagens.')
        return data
      })
    },
  })
}

export interface UserStats {
  total_images: number
  stats: {
    game_rank_idx: number
    pvp_em: number
    pvp_win_rate: number
    pvp_matches: number
    pvp_hours: number
    pvp_best_rank_rp: number
    pvp_best_rank_name: string
    pve_em: number
    pve_win_rate: number
    pve_matches: number
    pve_mission_easy: number
    pve_mission_medium: number
    pve_mission_hard: number
    pve_hours: number
    pvp_classes: any[]
    pve_classes: any[]
  }
}

export function useUserStats() {
  return useQuery<UserStats>({
    queryKey: ['userStats'],
    queryFn: () => authFetch('/api/processar/upload/stats/').then((r) => r.json()),
    refetchInterval: 5000,
  })
}
