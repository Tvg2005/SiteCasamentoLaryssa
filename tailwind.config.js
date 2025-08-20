/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        olive: {
          50: '#f7f8f0',
          100: '#eef0e0',
          200: '#dde2c2',
          300: '#c4ce9a',
          400: '#a8b572',
          500: '#8b9f52',
          600: '#6b7c3f',
          700: '#556b2f',
          800: '#475a28',
          900: '#3d4d24',
        },
      },
      fontFamily: {
        serif: ['Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};