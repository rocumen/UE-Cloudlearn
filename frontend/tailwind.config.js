/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--bg-canvas)',
        surface: 'var(--bg-surface)',
        subtle: 'var(--bg-subtle)',
        bar: 'var(--bg-bar)',
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        hairline: 'var(--border-hairline)',
        accent: {
          DEFAULT: 'var(--accent)',
          fill: 'var(--accent-fill)',
          hover: 'var(--accent-hover)',
          soft: 'var(--accent-soft)',
          on: 'var(--accent-on)'
        },
        status: {
          'success-fg': 'var(--status-success-fg)',
          'success-bg': 'var(--status-success-bg)',
          'warning-fg': 'var(--status-warning-fg)',
          'warning-bg': 'var(--status-warning-bg)',
          'error-fg': 'var(--status-error-fg)',
          'error-bg': 'var(--status-error-bg)'
        }
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        sheet: 'var(--shadow-sheet)'
      },
      fontFamily: {
        sans: ['var(--font-sans)']
      }
    }
  },
  plugins: []
};
