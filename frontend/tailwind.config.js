export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        docket: {
          50: '#eef4ff',
          100: '#dce7ff',
          200: '#bdd3ff',
          300: '#8cb4ff',
          400: '#5f90ff',
          500: '#3b6cf5',
          600: '#2e54d1',
          700: '#2644aa',
          800: '#243b89',
          900: '#0f172a'
        }
      },
      boxShadow: {
        docket: '0 24px 80px rgba(2, 6, 23, 0.35)',
      },
      letterSpacing: {
        legal: '0.32em',
      },
    },
  },
  plugins: [],
};
