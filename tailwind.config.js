/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'hit': 'hit-animation 0.2s ease-out',
        'move-target-pulse': 'move-target-pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'hit-animation': {
          '0%': { transform: 'scale(1)', filter: 'brightness(1)' },
          '50%': { transform: 'scale(1.1)', filter: 'brightness(2) drop-shadow(0 0 4px #ef4444)' },
          '100%': { transform: 'scale(1)', filter: 'brightness(1)' },
        },
        'move-target-pulse': {
          '0%, 100%': {
            transform: 'scale(1)',
            opacity: '0.7',
          },
          '50%': {
            transform: 'scale(0.8)',
            opacity: '0.4',
          },
        },
      },
    },
  },
  plugins: [],
}
