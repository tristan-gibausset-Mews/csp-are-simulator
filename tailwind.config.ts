import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Fond de page (noir) vs surface de carte vs surface haute-contraste.
        'background-page': '#000000',
        'background-card': '#2D2C37',
        'background-card-muted': '#242330',
        'background-card-light': '#FFFCF6',
        cream: '#FFFCF6',

        // Échelle "grise" réutilisée partout dans les composants existants,
        // recalibrée pour un thème sombre : 900 = texte principal (clair),
        // 500 = texte secondaire, 300 = bordure discrète, 100 = fond en survol.
        'mews-grey': {
          100: '#3A3944',
          300: '#4A4954',
          500: '#A6A4B8',
          900: '#FFFCF6',
        },

        // Accent principal Mews (rose) : boutons, focus, checkboxes, courbe CSP.
        'mews-accent': {
          DEFAULT: '#FF83DA',
          hover: '#FF63CE',
        },

        // Accents secondaires de la palette Mews, utilisés avec parcimonie.
        csp: '#FF83DA',
        are: '#E3FFFD',
        warn: '#FF5303',
        info: '#F7E1F7',
        success: '#E8FF5B',
        mint: '#D1F9D6',
      },
      boxShadow: {
        card: '0 1px 0 0 rgba(255, 252, 246, 0.03) inset',
        popover: '0 12px 32px -8px rgba(0, 0, 0, 0.6), 0 4px 10px -4px rgba(0, 0, 0, 0.4)',
      },
      fontFamily: {
        sans: ['Söhne', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
