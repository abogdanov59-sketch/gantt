const { amber, rose } = require('tailwindcss/colors')

module.exports = {
  content: ['index.html', './src/**/*.{vue,ts,js}'],
  theme: {
    extend: {
      colors: {
        critical: rose[500],
        baseline: amber[500]
      },
      height: {
        row: '40px'
      }
    }
  },
  plugins: []
}
