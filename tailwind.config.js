/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e6f7ff',
          100: '#b3e7ff',
          200: '#80d7ff',
          300: '#4dc7ff',
          400: '#26bcff',
          500: '#00b4ff',
          600: '#00a3e6',
          DEFAULT: '#2cbeff',
          dark: '#0095cc'
        },
        livo: {
          teal: '#1a7a7a',
          gold: '#c4a35a',
          paper: '#f5e6d3'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

