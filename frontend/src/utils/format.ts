export function formatAmount(value: string | number | undefined): string {
    if (value === undefined || value === null || value === '') return ''

    // Converte para string e limpa espaços
    const str = String(value).trim()

    // Se for apenas números, formata com pontos
    if (/^\d+(\.\d+)?$/.test(str)) {
        const num = parseFloat(str)
        return new Intl.NumberFormat('pt-BR').format(num)
    }

    return str
}
