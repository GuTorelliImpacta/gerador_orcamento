function luminance(hex: string) {
  const h = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export const isHex = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v)

export function contrastRatio(a: string, b: string) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}

/** Cor de texto legível (branco ou preto) sobre o fundo dado. */
export const readableOn = (bg: string) => (contrastRatio(bg, '#ffffff') >= contrastRatio(bg, '#000000') ? '#ffffff' : '#000000')

/** WCAG AA para texto normal: 4,5:1 */
export const passesAA = (fg: string, bg: string) => contrastRatio(fg, bg) >= 4.5
