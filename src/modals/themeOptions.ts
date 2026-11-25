import type { DropdownOption } from '../components/Dropdown'
import { THEMES } from '../constants'

/** Theme dropdown options; colors used by another budget/pot are marked "Already used" */
export function themeOptions(usedColors: string[], currentColor?: string): DropdownOption[] {
  const used = new Set(usedColors.map((c) => c.toLowerCase()))
  return THEMES.map((theme) => {
    const taken = used.has(theme.hex.toLowerCase()) && theme.hex.toLowerCase() !== currentColor?.toLowerCase()
    return {
      value: theme.hex,
      label: theme.name,
      color: theme.hex,
      disabled: taken,
      hint: taken ? 'Already used' : undefined,
    }
  })
}

/** First theme nobody uses yet, to preselect in "Add" forms */
export function firstFreeTheme(usedColors: string[]): string {
  const used = new Set(usedColors.map((c) => c.toLowerCase()))
  return THEMES.find((t) => !used.has(t.hex.toLowerCase()))?.hex ?? ''
}
