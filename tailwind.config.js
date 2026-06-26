/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f4ff',
          100: '#e0e9ff',
          200: '#c0d2ff',
          300: '#92b0ff',
          400: '#6085ff',
          500: '#3d5eff',
          600: '#2338f5',
          700: '#1a28e0',
          800: '#1b24b5',
          900: '#1c238e',
          950: '#141660',
        },
        neon: {
          blue:   '#00d4ff',
          purple: '#bf5fff',
          green:  '#00ff88',
          pink:   '#ff2d78',
        },
        glass: {
          white: 'rgba(255,255,255,0.06)',
          dark:  'rgba(0,0,0,0.4)',
          border:'rgba(255,255,255,0.12)',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':  'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'hero-mesh': `
          radial-gradient(at 40% 20%, rgba(61,94,255,0.3) 0px, transparent 50%),
          radial-gradient(at 80% 0%,  rgba(191,95,255,0.2) 0px, transparent 50%),
          radial-gradient(at 0%  50%, rgba(0,212,255,0.15) 0px, transparent 50%),
          radial-gradient(at 80% 50%, rgba(0,255,136,0.1) 0px, transparent 50%),
          radial-gradient(at 0%  100%,rgba(255,45,120,0.15)0px, transparent 50%)
        `,
      },
      fontFamily: {
        sans:  ['Inter', 'system-ui', 'sans-serif'],
        mono:  ['JetBrains Mono', 'Fira Code', 'monospace'],
        display:['Syne', 'Inter', 'sans-serif'],
      },
      fontSize: {
        '2xs': '0.625rem',
      },
      animation: {
        'float':       'float 6s ease-in-out infinite',
        'float-slow':  'float 10s ease-in-out infinite',
        'pulse-slow':  'pulse 4s cubic-bezier(0.4,0,0.6,1) infinite',
        'spin-slow':   'spin 20s linear infinite',
        'glow':        'glow 2s ease-in-out infinite alternate',
        'gradient':    'gradient 8s ease infinite',
        'slide-up':    'slideUp 0.5s ease-out',
        'slide-in':    'slideIn 0.4s ease-out',
        'fade-in':     'fadeIn 0.6s ease-out',
        'scale-in':    'scaleIn 0.4s ease-out',
        'shimmer':     'shimmer 2.5s linear infinite',
        'border-spin': 'borderSpin 4s linear infinite',
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%':     { transform: 'translateY(-20px)' },
        },
        glow: {
          from: { boxShadow: '0 0 20px rgba(61,94,255,0.4)' },
          to:   { boxShadow: '0 0 60px rgba(61,94,255,0.8), 0 0 100px rgba(191,95,255,0.4)' },
        },
        gradient: {
          '0%,100%': { backgroundPosition: '0% 50%' },
          '50%':     { backgroundPosition: '100% 50%' },
        },
        slideUp: {
          from: { opacity: 0, transform: 'translateY(30px)' },
          to:   { opacity: 1, transform: 'translateY(0)' },
        },
        slideIn: {
          from: { opacity: 0, transform: 'translateX(-20px)' },
          to:   { opacity: 1, transform: 'translateX(0)' },
        },
        fadeIn: {
          from: { opacity: 0 },
          to:   { opacity: 1 },
        },
        scaleIn: {
          from: { opacity: 0, transform: 'scale(0.9)' },
          to:   { opacity: 1, transform: 'scale(1)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition:  '1000px 0' },
        },
        borderSpin: {
          '0%':   { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glass':       '0 8px 32px rgba(0,0,0,0.37)',
        'glass-sm':    '0 4px 16px rgba(0,0,0,0.2)',
        'neon-blue':   '0 0 30px rgba(0,212,255,0.5)',
        'neon-purple': '0 0 30px rgba(191,95,255,0.5)',
        'neon-green':  '0 0 30px rgba(0,255,136,0.5)',
        'inner-glow':  'inset 0 1px 0 rgba(255,255,255,0.1)',
      },
      screens: {
        'xs': '475px',
      },
    },
  },
  plugins: [],
}
