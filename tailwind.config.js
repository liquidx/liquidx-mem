/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],

  theme: {
    extend: {},
    fontFamiliy: {
      sans: ['DM Sans', '-apple-system', 'BlinkMacSystemFont', 'Roboto', "Open Sans", "Helvetica Neue", 'sans-serif'],
    }
  },
  plugins: [],
}
