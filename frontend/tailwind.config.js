/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['class'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'Noto Sans',
          'sans-serif',
          'Apple Color Emoji',
          'Segoe UI Emoji',
        ],
      },
      colors: {
        brand: {
          gold: 'var(--brand-accent, #D4A843)',
          'gold-text': 'var(--brand-accent-text, #8A641E)',
          'gold-ring': 'var(--brand-accent-ring, #8A641E)',
          black: '#1A1A1A',
          white: '#FFFFFF',
          gray: '#2D2D2D',
          champagne: '#F5E6CC',
          rose: 'var(--brand-primary, #632238)',
          'rose-text': 'var(--brand-primary-text, #632238)',
          'rose-ring': 'var(--brand-primary-ring, #632238)',
        },
        /* Semantički sloj za dashboard (faza 0). Mapiran na CSS varijable iz globals.css. */
        surface: {
          DEFAULT: 'hsl(var(--surface))',
          muted: 'hsl(var(--surface-muted))',
          sunken: 'hsl(var(--surface-sunken))',
        },
        content: {
          DEFAULT: 'hsl(var(--text))',
          muted: 'hsl(var(--text-muted))',
          strong: 'hsl(var(--text-muted-strong))',
        },
        line: 'hsl(var(--line))',
        'control-border': 'hsl(var(--control-border))',
        /* Okvir inputa: default = današnji slate-200 (javni sajt netaknut),
           unutar .admin-shell se prebacuje na --control-border (1.4.11). */
        'input-border': 'hsl(var(--input-border))',
        'on-primary': 'hsl(var(--on-primary))',
        'nav-active': 'hsl(var(--nav-active-bg))',
        'focus-ring': 'var(--focus-ring, var(--brand-primary-ring, #632238))',
        danger: {
          DEFAULT: 'hsl(var(--danger))',
          foreground: 'hsl(var(--on-danger))',
        },
        ok: {
          DEFAULT: 'hsl(var(--ok-bg))',
          foreground: 'hsl(var(--ok-fg))',
        },
        warn: {
          DEFAULT: 'hsl(var(--warn-bg))',
          foreground: 'hsl(var(--warn-fg))',
        },
        bad: {
          DEFAULT: 'hsl(var(--bad-bg))',
          foreground: 'hsl(var(--bad-fg))',
        },
        info: {
          DEFAULT: 'hsl(var(--info-bg))',
          foreground: 'hsl(var(--info-fg))',
        },
        neutral: {
          DEFAULT: 'hsl(var(--neutral-bg))',
          foreground: 'hsl(var(--neutral-fg))',
        },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15, 23, 42, 0.06), 0 8px 24px rgba(15, 23, 42, 0.08)',
      },
      minHeight: {
        target: '2.75rem',
      },
      minWidth: {
        target: '2.75rem',
      },
    },
  },
  plugins: [],
};
