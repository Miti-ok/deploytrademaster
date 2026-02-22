import { useTheme } from '../hooks/useTheme.js'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button className="chip" onClick={toggleTheme} type="button">
      {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
    </button>
  )
}
