// Shared accent palette for decks and tags. Values are applied through inline
// styles / CSS variables, so they need no Tailwind safelisting.
export const palette = {
  rose: { label: '玫瑰', solid: '#F28BB5', from: '#F7A8C8', to: '#E58AC9' },
  lilac: { label: '丁香', solid: '#B59CF5', from: '#C7B3FA', to: '#9F8AF0' },
  blue: { label: '天藍', solid: '#4A9DFF', from: '#7CB8FF', to: '#4A8DF5' },
  teal: { label: '湖水', solid: '#3CC4C0', from: '#6ED8CF', to: '#2FB2BC' },
  green: { label: '青草', solid: '#5CC77A', from: '#86D99A', to: '#47B56A' },
  amber: { label: '琥珀', solid: '#F5B847', from: '#F9CF6E', to: '#EFA53A' },
  coral: { label: '珊瑚', solid: '#FF8A65', from: '#FFAA88', to: '#F57557' },
  slate: { label: '石墨', solid: '#9AA0AC', from: '#B8BDC6', to: '#8D93A0' },
} as const

export type ColorName = keyof typeof palette

export const colorNames = Object.keys(palette) as ColorName[]

export function getColor(name: string | undefined) {
  return palette[(name ?? 'rose') as ColorName] ?? palette.rose
}

export function gradientOf(name: string | undefined): string {
  const c = getColor(name)
  return `linear-gradient(135deg, ${c.from}, ${c.to})`
}
