import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: 'rgb(var(--color-brand-50) / <alpha-value>)',
          100: 'rgb(var(--color-brand-100) / <alpha-value>)',
          200: 'rgb(var(--color-brand-200) / <alpha-value>)',
          300: 'rgb(var(--color-brand-300) / <alpha-value>)',
          400: 'rgb(var(--color-brand-400) / <alpha-value>)',
          500: 'rgb(var(--color-brand-500) / <alpha-value>)',
          600: 'rgb(var(--color-brand-600) / <alpha-value>)',
          700: 'rgb(var(--color-brand-700) / <alpha-value>)',
          800: 'rgb(var(--color-brand-800) / <alpha-value>)',
          900: 'rgb(var(--color-brand-900) / <alpha-value>)',
          950: 'rgb(var(--color-brand-950) / <alpha-value>)',
        },
        surface: {
          DEFAULT: 'rgb(var(--color-surface) / <alpha-value>)',
          muted: 'rgb(var(--color-surface-muted) / <alpha-value>)',
          elevated: 'rgb(var(--color-surface-elevated) / <alpha-value>)',
          inverse: 'rgb(var(--color-surface-inverse) / <alpha-value>)',
        },
        content: {
          DEFAULT: 'rgb(var(--color-content) / <alpha-value>)',
          muted: 'rgb(var(--color-content-muted) / <alpha-value>)',
          faint: 'rgb(var(--color-content-faint) / <alpha-value>)',
          inverse: 'rgb(var(--color-content-inverse) / <alpha-value>)',
        },
        line: {
          DEFAULT: 'rgb(var(--color-line) / <alpha-value>)',
          strong: 'rgb(var(--color-line-strong) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: [
          'var(--font-poppins)',
          'var(--font-serif)',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
          'var(--font-display)',
        ],
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(6 27 54 / 0.05), 0 12px 30px -18px rgb(6 27 54 / 0.28)',
        'card-hover':
          '0 2px 6px -1px rgb(6 27 54 / 0.08), 0 30px 55px -26px rgb(6 27 54 / 0.4)',
        pop: '0 20px 50px -16px rgb(6 27 54 / 0.32), 0 8px 20px -10px rgb(6 27 54 / 0.18)',
        premium:
          '0 1px 2px 0 rgb(6 27 54 / 0.05), 0 18px 48px -24px rgb(6 27 54 / 0.4), 0 0 0 1px rgb(200 148 62 / 0.08)',
        gold: '0 22px 55px -25px rgb(200 148 62 / 0.65)',
        sheen: 'inset 0 1px 0 0 rgb(255 255 255 / 0.7)',
        'sheen-dark': 'inset 0 1px 0 0 rgb(255 255 255 / 0.06)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      transitionTimingFunction: {
        premium: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      backgroundImage: {
        'gold-sheen':
          'linear-gradient(135deg, #E3B968 0%, #C8943E 45%, #A77931 100%)',
      },
    },
  },
  plugins: [],
};

export default config;
