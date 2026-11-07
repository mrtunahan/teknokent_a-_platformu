/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Birincil aksiyon rengi (TeknoOrtak turuncusu)
        primary: {
          50: '#FFF4ED',
          100: '#FFE6D5',
          200: '#FFC9A8',
          300: '#FFA370',
          400: '#FF7A33',
          500: '#FF5E00',
          600: '#E05300',
          700: '#B84300',
          800: '#943808',
          900: '#78300B',
        },
        accent: { blue: '#2563EB', slate: '#F1F5F9' },
      },
      fontFamily: {
        sans: ['"Hanken Grotesk"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Hanken Grotesk"', 'Inter', 'ui-sans-serif', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 1px 2px 0 rgba(15,23,42,0.04), 0 1px 3px 0 rgba(15,23,42,0.04)',
        glow: '0 8px 20px -6px rgba(255,94,0,0.45)',
        card: '0 1px 2px rgba(15,23,42,0.04), 0 12px 32px -12px rgba(15,23,42,0.18)',
        float: '0 24px 60px -20px rgba(15,23,42,0.25), 0 2px 6px rgba(15,23,42,0.05)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #FF7A33 0%, #FF5E00 55%, #E05300 100%)',
      },
      keyframes: {
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
      },
      animation: {
        'gradient-shift': 'gradient-shift 12s ease infinite',
        float: 'float 7s ease-in-out infinite',
        shimmer: 'shimmer 2.2s infinite',
      },
    },
  },
  plugins: [],
};
