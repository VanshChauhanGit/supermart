/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#28469E',
          dark: '#162B6B',
          light: '#EBF2FF',
          muted: '#3B59B6'
        },
        mint: {
          DEFAULT: '#CAE8E8',
          dark: '#1E367D',
          light: '#F0F9F9'
        },
        surface: '#F8FAFC',
        card: '#FFFFFF',
        emerald: {
          brand: '#059669',
          light: '#D1FAE5'
        },
        amber: {
          brand: '#D97706',
          light: '#FEF3C7'
        },
        rose: {
          brand: '#E11D48',
          light: '#FFE4E6'
        }
      }
    },
  },
  plugins: [],
};
