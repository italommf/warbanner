import { create } from 'zustand'
import type { RefObject } from 'react'

export type Category = 'marcas' | 'insignias' | 'fitas'
export type FilterCategory = 'marcas' | 'insignias' | 'fitas'
export type MainFilter = 'todos' | 'armas' | 'pvp' | 'pve'
export type ArmasFilter = 'todos' | 'low' | '999' | '2500' | '5000' | '10000' | 'especiais' | 'crown' | 'dourada'
export type ColorFilter = 'todos' | 'ouro' | 'prata' | 'bronze' | 'preto' | 'vermelho' | 'azul' | 'verde' | 'outro'

interface CategoryState {
  page: number
  selected: string | null
}

export interface BgColors {
  tl: string  // top-left     "R,G,B"
  tr: string  // top-right    "R,G,B"
  bl: string  // bottom-left  "R,G,B"
  br: string  // bottom-right "R,G,B"
}

interface BannerStore {
  nick: string
  clan: string
  setNick: (v: string) => void
  setClan: (v: string) => void

  marcas: CategoryState
  insignias: CategoryState
  fitas: CategoryState
  patentes: { selected: string | null }

  setPage: (cat: Category, page: number) => void
  selectItem: (cat: Category, filename: string | null) => void
  selectPatente: (filename: string | null) => void

  // Ref do canvas compartilhado com BottomBar para toDataURL
  canvasRef: RefObject<HTMLCanvasElement | null> | null
  setCanvasRef: (ref: RefObject<HTMLCanvasElement | null> | null) => void

  // Background wallpaper
  bgImage: string | null
  setBgImage: (url: string | null) => void
  bgColors: BgColors | null
  setBgColors: (colors: BgColors | null) => void

  // Canvas
  noFrame: boolean
  setNoFrame: (v: boolean) => void

  // Filtros
  mainFilter: MainFilter
  armasFilter: ArmasFilter
  colorFilter: ColorFilter
  setMainFilter: (v: MainFilter) => void
  setArmasFilter: (v: ArmasFilter) => void
  setColorFilter: (v: ColorFilter) => void

  searchTerm: string
  setSearchTerm: (v: string) => void
  hideEmpty: boolean
  setHideEmpty: (v: boolean) => void
  rankLevel: string
  setRankLevel: (v: string) => void
}


export const useBannerStore = create<BannerStore>((set) => ({
  nick: '',
  clan: '',
  setNick: (nick) => set({ nick }),
  setClan: (clan) => set({ clan }),

  marcas: { page: 0, selected: null },
  insignias: { page: 0, selected: null },
  fitas: { page: 0, selected: null },
  patentes: { selected: null },

  setPage: (cat, page) =>
    set((s) => ({ [cat]: { ...s[cat], page } })),

  selectItem: (cat, filename) =>
    set((s) => ({
      [cat]: {
        ...s[cat],
        selected: s[cat].selected === filename ? null : filename,
      },
    })),

  selectPatente: (filename) =>
    set((s) => ({ patentes: { ...s.patentes, selected: filename } })),

  canvasRef: null,
  setCanvasRef: (ref) => set({ canvasRef: ref }),

  // Background — persistido em localStorage
  bgImage: localStorage.getItem('bgImage') ?? null,
  setBgImage: (url) => {
    if (url) localStorage.setItem('bgImage', url)
    else localStorage.removeItem('bgImage')
    set({ bgImage: url })
  },
  bgColors: null,
  setBgColors: (bgColors) => set({ bgColors }),

  noFrame: false,
  setNoFrame: (noFrame) => set({ noFrame }),

  // Filtros — padrão: aplica em todas as categorias, sem filtro ativo
  mainFilter: 'todos',
  armasFilter: 'todos',
  colorFilter: 'todos',

  setMainFilter: (mainFilter) =>

    set({ mainFilter, armasFilter: 'todos' }),

  setArmasFilter: (armasFilter) => set({ armasFilter }),

  setColorFilter: (colorFilter) => set({ colorFilter }),

  searchTerm: '',
  setSearchTerm: (searchTerm) => set({ searchTerm }),

  hideEmpty: true,
  setHideEmpty: (hideEmpty) => set({ hideEmpty }),

  rankLevel: '',
  setRankLevel: (rankLevel) => set({ rankLevel }),
}))
