const { slate, emerald, amber } = require('tailwindcss/colors')

module.exports = {
  content: ['index.html', './src/**/*.{vue,ts,js}'],
  theme: {
    extend: {
      colors: {
        critical: emerald[500],
        baseline: amber[500]
      },
      height: {
        row: '40px'
      }
    }
  },
  plugins: []
}
