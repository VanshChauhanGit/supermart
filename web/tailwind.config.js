/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ocean: {
          light: '#F4FAFA',
          DEFAULT: '#CAE8E8',
          dark: '#A5D6D6',
          glass: 'rgba(202, 232, 232, 0.3)',
        },
        brilliant: {
          light: '#3B5ECA',
          DEFAULT: '#28469E',
          dark: '#1E367D',
          glass: 'rgba(40, 70, 158, 0.1)',
        },
        light: {
          bg: '#F4F8F8',
          surface: '#FFFFFF',
          card: '#FFFFFF',
          hover: '#F0F5F5',
          border: '#E2E8F0',
          muted: '#64748B',
          text: '#0F172A',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'light-sm': '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)',
        'light-md': '0 4px 12px rgba(40, 70, 158, 0.08), 0 2px 4px rgba(0,0,0,0.02)',
        'light-lg': '0 10px 25px rgba(40, 70, 158, 0.12), 0 4px 10px rgba(0,0,0,0.03)',
        'blue-glow': '0 4px 20px rgba(40, 70, 158, 0.25)',
        'ocean-glow': '0 4px 20px rgba(202, 232, 232, 0.5)',
      }
    },
  },
  plugins: [],
}
