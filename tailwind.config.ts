import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#FFFCF6',
        'mews-grey': {
          100: '#EDEDEF',
          300: '#C4C9DD',
          500: '#928FAA',
          900: '#2D2C37',
        },
        'mews-accent': {
          DEFAULT: '#FF5303',
          light: '#FFE7DA',
        },
        csp: {
          DEFAULT: '#2563EB',
          light: '#DBEAFE',
        },
        are: {
          DEFAULT: '#0F9D6B',
          light: '#DCFCE7',
        },
        warn: {
          DEFAULT: '#B45309',
          light: '#F7E1F7',
        },
      },
      fontFamily: {
        sans: ['Söhne', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
