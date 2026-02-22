/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}'
  ],
  theme: {
    extend: {
      colors: {
        ink: '#0D0F12',
        slate: '#12161C',
        mist: '#E8EDF2',
        ocean: '#0E5CAD',
        ember: '#E26B2B',
        moss: '#2D6A4F'
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui'],
        body: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui']
      },
      boxShadow: {
        glow: '0 0 30px rgba(14, 92, 173, 0.35)'
      }
    }
  },
  plugins: []
}
