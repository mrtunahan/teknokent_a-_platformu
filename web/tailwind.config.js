/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#05070f',
          900: '#080b17',
          850: '#0b1020',
          800: '#0f1529',
          700: '#161d36',
          600: '#222a47',
        },
        electric: { 300: '#7cb4ff', 400: '#4d94ff', 500: '#2f7bff', 600: '#1f63e6' },
        violet: { 400: '#a78bfa', 500: '#8b5cf6' },
        aqua: { 300: '#5eead4', 400: '#2dd4bf' },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'ui-sans-serif', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 1px 0 0 rgba(255,255,255,0.06) inset, 0 20px 50px -20px rgba(0,0,0,0.6)',
        glow: '0 0 0 1px rgba(77,148,255,0.35), 0 10px 40px -10px rgba(47,123,255,0.55)',
        card: '0 30px 80px -30px rgba(0,0,0,0.85), 0 1px 0 0 rgba(255,255,255,0.08) inset',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #2f7bff 0%, #8b5cf6 55%, #2dd4bf 100%)',
      },
      keyframes: {
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
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
