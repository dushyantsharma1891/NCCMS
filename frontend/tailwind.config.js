/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#0a1628',
          900: '#0f2044',
          800: '#15294f',
          700: '#1c3566',
        },
        accent: {
          500: '#2563eb',
          600: '#1d4ed8',
        },
      },
      fontFamily: {
        display: ['"Merriweather"', 'serif'],
        sans: ['"Inter"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
