import { MoonIcon, SunIcon } from 'lucide-react'
import { useTheme } from 'next-themes'

import { DropdownMenuItem } from '@/components/ui/dropdown-menu'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <DropdownMenuItem
      closeOnClick={false}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
      {isDark ? 'Light mode' : 'Dark mode'}
    </DropdownMenuItem>
  )
}