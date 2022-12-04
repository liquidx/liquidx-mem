/** @type {import('tailwindcss').Config} */
module.exports = {
  purge: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],

  darkMode: false,
  theme: {
    extend: {},
    fontFamiliy: {
      sans: ['DM Sans', '-apple-system', 'BlinkMacSystemFont', 'Roboto', "Open Sans", "Helvetica Neue", 'sans-serif'],
    }
  },
  plugins: [],
}
