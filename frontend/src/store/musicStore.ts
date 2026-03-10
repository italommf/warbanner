import { create } from 'zustand'

export interface MusicTrack {
  name: string
  url: string
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

interface MusicStore {
  queue: MusicTrack[]
  currentIndex: number
  isPlaying: boolean
  isMuted: boolean
  volume: number
  playKey: number
  playerExpanded: boolean
  setPlayerExpanded: (v: boolean) => void
  setVolume: (v: number) => void


  // Carrega faixas e marca isPlaying=true em um único set() para evitar renders extras
  loadAndPlay: (tracks: MusicTrack[]) => void
  next: () => void
  prev: () => void
  setIsPlaying: (v: boolean) => void
  togglePlay: () => void
  toggleMute: () => void
}

export const useMusicStore = create<MusicStore>((set, get) => ({
  queue: [],
  currentIndex: 0,
  isPlaying: true,
  isMuted: false,
  volume: 0.25,
  playKey: 0,
  playerExpanded: false,
  setPlayerExpanded: (playerExpanded) => set({ playerExpanded }),
  setVolume: (volume) => set({ volume }),


  loadAndPlay: (tracks) => {
    if (!tracks.length) return
    const STARTERS = ['main theme']
    const starterIdx = tracks.findIndex((t) =>
      STARTERS.some((s) => t.name.toLowerCase().includes(s))
    )
    let first: MusicTrack
    let rest: MusicTrack[]
    if (starterIdx >= 0) {
      first = tracks[starterIdx]
      rest = shuffle(tracks.filter((_, i) => i !== starterIdx))
    } else {
      const shuffled = shuffle(tracks)
      first = shuffled[0]
      rest = shuffled.slice(1)
    }
    // Um único set() → um único render → effects disparam juntos
    set({ queue: [first, ...rest], currentIndex: 0, playKey: get().playKey + 1, isPlaying: true })
  },

  next: () => {
    const { queue, currentIndex, playKey } = get()
    if (!queue.length) return
    const next = currentIndex + 1
    if (next >= queue.length) {
      set({ queue: shuffle(queue), currentIndex: 0, playKey: playKey + 1 })
    } else {
      set({ currentIndex: next, playKey: playKey + 1 })
    }
  },

  prev: () => {
    const { queue, currentIndex, playKey } = get()
    if (!queue.length) return
    set({ currentIndex: currentIndex > 0 ? currentIndex - 1 : queue.length - 1, playKey: playKey + 1 })
  },

  setIsPlaying: (isPlaying) => set({ isPlaying }),
  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),
  toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),
}))
