/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#D62828',
          dark: '#A11D1D',
          darker: '#7A1414',
          soft: 'rgba(214,40,40,0.10)',
        },
        ink: {
          950: '#050505',
          900: '#0A0A0A',
          800: '#111111',
          700: '#1A1A1A',
          600: '#262626',
          500: '#3A3A3A',
          400: '#5A5A5A',
          300: '#9A9A9A',
          200: '#C9C9C9',
          100: '#E8E8E8',
          50:  '#F5F5F5',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Anton', 'Impact', 'sans-serif'],
        serif: ['"Playfair Display"', 'serif'],
      },
      letterSpacing: {
        tightest: '-0.04em',
      },
      animation: {
        'fade-up': 'fadeUp 0.6s ease-out',
        'pulse-dot': 'pulseDot 1.8s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseDot: {
          '0%,100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.4', transform: 'scale(1.4)' },
        },
      },
    },
  },
  plugins: [],
};
