/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#05070f',
          surface: '#0d111d',
          card: 'rgba(16, 23, 38, 0.85)',
          border: '#1f293d',
          neon: '#00f0ff',
          pink: '#ff007f',
          yellow: '#ffe600',
          green: '#00ff66',
          purple: '#9d00ff',
          orange: '#ff5500',
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Orbitron"', '"Rajdhani"', 'sans-serif'],
      },
      boxShadow: {
        'neon-cyan': '0 0 15px rgba(0, 240, 255, 0.4), 0 0 30px rgba(0, 240, 255, 0.2)',
        'neon-pink': '0 0 15px rgba(255, 0, 127, 0.4), 0 0 30px rgba(255, 0, 127, 0.2)',
        'neon-green': '0 0 15px rgba(0, 255, 102, 0.4), 0 0 30px rgba(0, 255, 102, 0.2)',
        'neon-yellow': '0 0 15px rgba(255, 230, 0, 0.4), 0 0 30px rgba(255, 230, 0, 0.2)',
        'neon-purple': '0 0 15px rgba(157, 0, 255, 0.4), 0 0 30px rgba(157, 0, 255, 0.2)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.4)',
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scanline': 'scanline 8s linear infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '1', filter: 'drop-shadow(0 0 8px rgba(0, 240, 255, 0.6))' },
          '50%': { opacity: '0.6', filter: 'drop-shadow(0 0 2px rgba(0, 240, 255, 0.2))' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        }
      }
    },
  },
  plugins: [],
}
