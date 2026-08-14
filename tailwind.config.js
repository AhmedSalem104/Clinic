/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./public/**/*.html', './public/js/**/*.{js,mjs}'],
  theme: {
    extend: {
      colors: {
        clinic: {
          50: '#eff6ff',
          600: '#2563eb',
          700: '#1d4ed8',
          900: '#0f172a'
        }
      },
      fontFamily: {
        sans: ['Inter', 'Cairo', 'ui-sans-serif', 'system-ui']
      }
    }
  },
  plugins: []
};
