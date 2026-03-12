import type { Item } from '@/api/hooks'
import type { MainFilter, ArmasFilter, ColorFilter } from '@/store/bannerStore'

export function applyFilters(
  items: Item[],
  category: 'marcas' | 'insignias' | 'fitas',
  mainFilter: MainFilter,
  armasFilter: ArmasFilter,
  colorFilter: ColorFilter,
  searchTerm: string,
  hideEmpty: boolean,
): Item[] {
  let result = items

  // 1. Ocultar sem descrição (se ativo)
  if (hideEmpty) {
    result = result.filter((i) => i.description && i.description.trim() !== '')
  }

  // 2. Pesquisa de termo (Nome ou Descrição)
  if (searchTerm.trim() !== '') {
    const term = searchTerm.toLowerCase()
    result = result.filter((i) =>
      i.name.toLowerCase().includes(term) ||
      (i.description && i.description.toLowerCase().includes(term))
    )
  }

  // 3. Filtros Específicos (Armas, PvP, PvE)
  if (mainFilter === 'armas') {
    result = result.filter((i) => {
      // Filtro de Crown
      if (armasFilter === 'crown') {
        if (!i.description) return false
        const lowerDesc = i.description.toLowerCase()
        return lowerDesc.includes('elimine') && lowerDesc.includes('inimigos') && lowerDesc.includes('coroa')
      }

      // Filtro de Dourada
      if (armasFilter === 'dourada') {
        if (!i.description) return false
        const hasDourada = /dourada/i.test(i.description)
        if (!hasDourada) return false

        if (category === 'fitas') {
          const match = i.description.match(/Elimine\s+([\d.]+)\s+inimigos/i)
          if (!match) return false
          const num = parseInt(match[1].replace(/\./g, ''), 10)
          return num === 999
        }

        // Marcas e Insígnias: remover desafios de matar com a arma (foco em "Obter")
        const lowerDesc = i.description.toLowerCase()
        const match = i.description.match(/Elimine\s+([\d.]+)\s+inimigos/i)
        const num = match ? parseInt(match[1].replace(/\./g, ''), 10) : 0

        // Se tiver palavras de eliminação e objetivo alto (5k/10k), oculta
        const hasForbidden = ['elimine', 'inimigos', 'com', 'versão'].some(w => lowerDesc.includes(w))
        if (hasForbidden && (num === 5000 || num === 10000)) return false

        // Limpeza: remove desafios que pedem para "Eliminar" e citam a "versão" (indicativo de stripe)
        if ((lowerDesc.includes('elimine') || lowerDesc.includes('inimigos')) && lowerDesc.includes('versão')) {
          return false
        }

        return true
      }

      // Filtro de Especiais (Coleções e Skins)
      if (armasFilter === 'especiais') {
        if (!i.description) return false
        const lowerDesc = i.description.toLowerCase()

        // Não pode ser dourada
        if (lowerDesc.includes('dourado') || lowerDesc.includes('dourada')) return false

        // Palavras proibidas apenas para fitas
        if (category === 'fitas') {
          const forbiddenFitas = [
            'conclua', 'complete', 'coroa', 'torneio', 'passe de batalha', 'conquista especial',
            'pvp', 'dano', 'gum lovers', 'ganhe qualquer uma', 'marte', 'in god we trust',
            'classificatórias', 'lan', 'energético', 'melhor jogador', 'torretas', 'na missão', "sed"
          ]
          if (forbiddenFitas.some(fw => lowerDesc.includes(fw))) return false
        }

        const specialKWs = [
          'anúbis', 'absolute', 'apache', 'pharaoh', 'hidden war', 'valquíria', 'special', 'pyrite',
          'godfather', 'scar', 'viridian', 'umbra', 'santa muerte', 'aztec', 'corporate', 'shroud',
          'apostate', 'armament company', 'hydra', 'atlas', 'obsidian', 'morion', 'ônyx', 'sindicato',
          'fobos', 'berserk', 'particle', 'rogue', 'guardian', 'inverno', 'imperador amarelo',
          'galáxia', 'infernal', 'torneio mundial', 'papai noel maligno', 'great gatsby', 'gorgon',
          'medusa', 'mechanical', 'heat', 'frankenstein', 'quebra-gelo', 'yakuza', 'caimão', 'rust',
          'banshee', 'red dusk', 'road block', 'higwayman', 'moray', 'terremoto', 'deimos',
          'light circle', 'cyber pro'
        ]

        return specialKWs.some(kw => lowerDesc.includes(kw))
      }

      // Filtro de Eliminações (números)
      if (!i.description) return false
      const match = i.description.match(/Elimine\s+([\d.]+)\s+inimigos/i)

      // Se selecionou "todos" em armas, aceita qualquer coisa que pareça de arma/combate
      if (armasFilter === 'todos') {
        return match || /elimine|mate|vencer|partida/i.test(i.description)
      }

      if (!match) return false
      const num = parseInt(match[1].replace(/\./g, ''), 10)

      if (armasFilter === 'low') return num < 999
      if (armasFilter === '999') return num === 999 || num === 1000
      if (armasFilter === '2500') return num === 2500
      if (armasFilter === '5000') return num === 5000
      if (armasFilter === '10000') return num === 10000

      return false
    })
  }
  else if (mainFilter === 'pvp') {
    result = result.filter((i) => /pvp/i.test(i.filename) || (i.description && /vencer|vitória|ganhar\s+partida/i.test(i.description)))
  } else if (mainFilter === 'pve') {
    result = result.filter((i) => /pve/i.test(i.filename) || (i.description && /completar|missão|operação/i.test(i.description)))
  }

  // 4. Filtro de cor
  if (colorFilter !== 'todos') {
    result = result.filter((i) => (i.color ?? 'outro') === colorFilter)
  }

  return result
}
