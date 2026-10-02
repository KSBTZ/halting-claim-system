/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // SIC Life green — brand-700 is the primary brand colour
        brand: {
          50: '#f1f8ec',
          100: '#dff0d2',
          200: '#bfe0a6',
          300: '#94c86f',
          400: '#66a83c',
          500: '#3f8a17',
          600: '#227005',
          700: '#185700',
          800: '#134500',
          900: '#0e3500',
          950: '#071d00',
        },
        // SIC Life yellow — sun-400 is the primary accent
        sun: {
          50: '#fffde6',
          100: '#fffbb8',
          200: '#fff97a',
          300: '#fff83d',
          400: '#fff700',
          500: '#e0d900',
          600: '#b3ad00',
          700: '#7d7900',
        },
        canvas: '#f4f7f1',
      },
      fontFamily: {
        heading: ['Montserrat', 'Avenir', 'sans-serif'],
        body: ['Inter', 'system-ui', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.06)',
        lift: '0 12px 24px -12px rgba(16, 24, 40, 0.18), 0 4px 8px -4px rgba(16, 24, 40, 0.06)',
        glow: '0 10px 24px -10px rgba(24, 87, 0, 0.55)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        toastIn: {
          '0%': { opacity: '0', transform: 'translateY(-12px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.4s ease-out',
        slideUp: 'slideUp 0.4s ease-out both',
        scaleIn: 'scaleIn 0.18s ease-out',
        toastIn: 'toastIn 0.25s ease-out',
      },
    },
  },
  plugins: [],
}
