const defaultTheme = require('tailwindcss/defaultTheme')
const windmill = require('@roketid/windmill-react-ui/config')
module.exports = windmill({
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  extend: {},
  plugins: [],
})

