import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import type { AuthUser } from '@/store/authStore'

// ── Auth fetch helper ───────────────────────────────────────────────────────

export function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
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
  description?: string
  amount?: string
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
    queryFn: () => authFetch('/api/items/').then(async (r) => {
      const data = await r.json()
      if (!r.ok) throw new Error(data.detail || 'Erro ao carregar itens')
      return data
    }),
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
    queryFn: () => authFetch('/api/backgrounds/').then(async (r) => {
      const data = await r.json()
      if (!r.ok) throw new Error(data.detail || 'Erro ao carregar fundos')
      return data
    }),
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
    queryFn: () => authFetch('/api/community/latest/').then(async (r) => {
      const data = await r.json()
      if (!r.ok) throw new Error(data.detail || 'Erro ao carregar últimos banners')
      return data
    }),
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  })
}

export function useCommunity(sort = 'newest', group = '') {
  return useInfiniteQuery<CommunityPage>({
    queryKey: ['community', sort, group],
    queryFn: ({ pageParam }) =>
      authFetch(`/api/community/?page=${pageParam}&sort=${sort}&group=${group}`).then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.detail || 'Erro ao carregar comunidade')
        return data
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage?.has_more ? allPages.length + 1 : undefined,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  })
}

export function useGifs() {
  return useQuery<GifItem[]>({
    queryKey: ['gifs'],
    queryFn: () => authFetch('/api/gifs/').then(async (r) => {
      const data = await r.json()
      if (!r.ok) throw new Error(data.detail || 'Erro ao carregar GIFs')
      return data
    }),
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
    my_marcas: string[]
    my_insignias: string[]
    my_fitas: string[]
  }
}

export function useUserStats() {
  return useQuery<UserStats>({
    queryKey: ['userStats'],
    queryFn: () => authFetch('/api/processar/upload/stats/').then((r) => r.json()),
    refetchInterval: 5000,
  })
}

// ── Admin Hooks ─────────────────────────────────────────────────────────────

export interface AdminUser {
  id: number
  username: string
  email: string
  game_nick: string
  role: string
  is_staff: boolean
  date_joined: string
}

export interface AdminUserDetail extends AdminUser {
  is_active: boolean
  game_clan: string
  game_rank: string
  game_rank_idx: number
  pvp_em: number
  pvp_win_rate: number
  pvp_matches: number
  pvp_hours: number
  pvp_best_rank_rp: number
  pvp_best_rank_name: string
  pvp_classes: any[]
  pve_em: number
  pve_win_rate: number
  pve_matches: number
  pve_mission_easy: number
  pve_mission_medium: number
  pve_mission_hard: number
  pve_hours: number
  pve_classes: any[]
  my_marcas: string[]
  my_insignias: string[]
  my_fitas: string[]
  warchaos_solicitou: boolean
  warchaos_solicitou_at: string | null
  warchaos_user: string | null
  warchaos_nick: string | null
  warchaos_migrado: boolean
}

export interface AdminUserImage {
  id: number
  image: string
  status: string
  image_type: string
  created_at: string
}

export interface AdminUsersResponse {
  users: AdminUser[]
  has_more: boolean
  total: number
}

export function useAdminUsers(search = '', type = 'all') {
  return useInfiniteQuery<AdminUsersResponse>({
    queryKey: ['admin-users', search, type],
    queryFn: ({ pageParam }) =>
      authFetch(`/api/admin/users/?search=${search}&type=${type}&page=${pageParam}`).then((r) => r.json()),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.has_more ? allPages.length + 1 : undefined,
  })
}

export function useAdminUserDetail(userId: number | null) {
  return useQuery<AdminUserDetail>({
    queryKey: ['admin-user', userId],
    queryFn: () => authFetch(`/api/admin/users/${userId}/`).then((r) => r.json()),
    enabled: userId !== null,
  })
}

export interface AdminLog {
  id: number
  actor: string
  field_name: string
  old_value: string
  new_value: string
  created_at: string
}

export function useAdminUserHistory(userId: number | null) {
  return useQuery<AdminLog[]>({
    queryKey: ['admin-user-history', userId],
    queryFn: () => authFetch(`/api/admin/users/${userId}/history/`).then((r) => r.json()),
    enabled: userId !== null,
  })
}

export function useUpdateAdminUser() {
  const qc = useQueryClient()
  return useMutation<AdminUserDetail, Error, { id: number; data: any }>({
    mutationFn: ({ id, data }) =>
      authFetch(`/api/admin/users/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      qc.invalidateQueries({ queryKey: ['admin-user', data.id] })
    },
  })
}

export function useAdminUserImages(userId: number | null) {
  return useQuery<AdminUserImage[]>({
    queryKey: ['admin-user-images', userId],
    queryFn: () => authFetch(`/api/admin/users/${userId}/images/`).then((r) => r.json()),
    enabled: userId !== null,
  })
}

export interface AdminGlobalStats {
  total_users: number
  total_admins: number
  total_mods: number
  total_images: number
  pending: number
  failed: number
  done: number
}

export function useAdminGlobalStats() {
  return useQuery<AdminGlobalStats>({
    queryKey: ['admin-global-stats'],
    queryFn: () => authFetch('/api/admin/stats/').then((r) => r.json()),
    refetchInterval: 10000,
  })
}

export interface QueueImage {
  id: number
  image: string
  image_type: string
  status: string
  created_at: string
  error: string | null
}

export interface QueueUser {
  id: number
  username: string
  game_nick: string | null
  images: QueueImage[]
}

export function useAdminQueue() {
  return useQuery<QueueUser[]>({
    queryKey: ['admin-queue'],
    queryFn: () => authFetch('/api/admin/queue/').then((r) => r.json()),
    refetchInterval: 5000, // Tempo real (5s)
  })
}

export function useReprocessImage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => authFetch(`/api/admin/reprocess/${id}/`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-queue'] })
      qc.invalidateQueries({ queryKey: ['admin-global-stats'] })
    }
  })
}

export interface AdminMigration {
  user_id: number
  username: string
  email: string
  warchaos_user: string
  warchaos_nick: string
  solicitou_at: string
  migrado: boolean
}

export function useAdminMigrations() {
  return useQuery<AdminMigration[]>({
    queryKey: ['admin-migrations'],
    queryFn: () => authFetch('/api/admin/migrations/').then((r) => r.json()),
  })
}

// ── Support System Hooks ────────────────────────────────────────────────────

export type TicketStatus = 'waiting' | 'in_progress' | 'resolved' | 'unsolved'
export type TicketCategory = 'revisao_pvp' | 'revisao_pve' | 'conquistas' | 'migracao' | 'bug' | 'sugestao'

export interface TicketResponse {
  id: number
  user: string
  message: string
  is_staff_response: boolean
  created_at: string
}

export interface SupportTicket {
  id: number
  name: string
  category: TicketCategory
  message?: string
  status: TicketStatus
  assigned_to: string | null
  assigned_to_nick?: string | null
  assigned_to_role?: string | null
  created_at: string
  updated_at: string
  username: string
  unread_count?: number
  responses?: TicketResponse[]
}

export function useTickets() {
  const token = useAuthStore((s) => s.accessToken)
  return useQuery<SupportTicket[]>({
    queryKey: ['tickets', !!token],
    queryFn: () => authFetch('/api/support/tickets/').then((r) => r.json()),
    enabled: !!token,
    staleTime: 30_000,
  })
}

export function useTicketDetail(id: number | null) {
  return useQuery<SupportTicket>({
    queryKey: ['ticket', id],
    queryFn: () => authFetch(`/api/support/tickets/${id}/`).then((r) => r.json()),
    enabled: id !== null,
    staleTime: 10_000,
  })
}

export function useCreateTicket() {
  const qc = useQueryClient()
  return useMutation<any, Error, { name: string; category: string; message: string }>({
    mutationFn: (payload) =>
      authFetch('/api/support/tickets/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then(async (r) => {
        const body = await r.json()
        if (!r.ok) throw new Error(body.error || 'Erro ao abrir chamado')
        return body
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tickets'] }),
  })
}

export function useReplyTicket() {
  const qc = useQueryClient()
  return useMutation<any, Error, { id: number; message: string }>({
    mutationFn: ({ id, message }) =>
      authFetch(`/api/support/tickets/${id}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      }).then(async (r) => {
        const body = await r.json()
        if (!r.ok) throw new Error(body.error || 'Erro ao responder')
        return body
      }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['ticket', id] })
      qc.invalidateQueries({ queryKey: ['tickets'] })
    }
  })
}

export function useUpdateTicketStatus() {
  const qc = useQueryClient()
  return useMutation<any, Error, { id: number; status: string }>({
    mutationFn: ({ id, status }) =>
      authFetch(`/api/support/tickets/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }).then(async (r) => {
        const body = await r.json()
        if (!r.ok) throw new Error(body.error || 'Erro ao atualizar status')
        return body
      }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['ticket', id] })
      qc.invalidateQueries({ queryKey: ['tickets'] })
    }
  })
}

export interface RankingItem {
  username: string
  nick: string
  avatar: string | null
  rank_idx: number
  value: number
}

export interface RankingData {
  top5: RankingItem[]
  user: RankingItem & { rank: number }
}

export interface CommunityStatistics {
  general: {
    player_count: number
    total_pvp_matches: number
    total_pve_matches: number
    total_pve_easy: number
    total_pve_normal: number
    total_pve_hard: number
    total_hours: number
  }
  pvp: {
    ranking_kd: RankingData
    ranking_matches: RankingData
    ranking_hours: RankingData
    ranking_rank: RankingData
    community_avgs: {
      kd: number
      matches: number
      hours: number
      rank: number
    }
    user_stats: {
      kd: number
      matches: number
      hours: number
      rank: number
    }
  }
  pve: {
    ranking_total: RankingData
    ranking_easy: RankingData
    ranking_normal: RankingData
    ranking_hard: RankingData
    community_avgs: {
      total: number
      hours: number
      easy: number
      normal: number
      hard: number
    }
    user_stats: {
      total: number
      hours: number
      easy: number
      normal: number
      hard: number
    }
  }
}

export function useCommunityStatistics() {
  return useQuery<CommunityStatistics>({
    queryKey: ['community', 'statistics'],
    queryFn: () => authFetch('/api/community/statistics/').then((r) => r.json()),
  })
}
export function useRequestWarchaosMigration() {
  const updateUser = useAuthStore((s) => s.updateUser)
  const user = useAuthStore((s) => s.user)

  return useMutation({
    mutationFn: (payload: { warchaos_user: string; warchaos_nick: string }) => 
      authFetch('/api/warchaos/request/', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error || 'Erro ao solicitar migração')
        return data
      }),
    onSuccess: (_, variables) => {
      if (user) {
        updateUser({ 
          ...user, 
          warchaos_solicitou: true,
          warchaos_solicitou_at: new Date().toISOString(),
          warchaos_user: variables.warchaos_user,
          warchaos_nick: variables.warchaos_nick
        })
      }
    }
  })
}
