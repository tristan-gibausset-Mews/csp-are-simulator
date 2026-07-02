import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#FDFBF7',
        'mews-grey': {
          100: '#EEEEF3',
          300: '#C9CCE0',
          500: '#8E8BA8',
          900: '#20212E',
        },
        'mews-accent': {
          DEFAULT: '#6E5AE0',
          hover: '#5A46CC',
          light: '#F1EEFC',
        },
        info: {
          DEFAULT: '#8C7CE8',
          light: '#F1EEFC',
        },
        success: {
          DEFAULT: '#279268',
          light: '#E4F5EC',
        },
        csp: {
          DEFAULT: '#3E63E0',
          light: '#E8EEFC',
        },
        are: {
          DEFAULT: '#279268',
          light: '#E4F5EC',
        },
        warn: {
          DEFAULT: '#C97A3B',
          light: '#FBEEE1',
        },
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(32, 33, 46, 0.05), 0 1px 1px 0 rgba(32, 33, 46, 0.03)',
        popover: '0 8px 24px -4px rgba(32, 33, 46, 0.12), 0 2px 6px -2px rgba(32, 33, 46, 0.06)',
      },
      fontFamily: {
        sans: ['Söhne', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
