import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Core palette
        background: '#080A0F',
        surface: '#0D1117',
        'surface-2': '#111827',
        'surface-3': '#1a2235',
        // Accents
        cyan: {
          DEFAULT: '#00D4FF',
          dim: '#00A8CC',
          glow: 'rgba(0, 212, 255, 0.15)',
          border: 'rgba(0, 212, 255, 0.3)',
          bright: '#40E0FF',
        },
        amber: {
          DEFAULT: '#FFB830',
          dim: '#CC9226',
          glow: 'rgba(255, 184, 48, 0.15)',
          border: 'rgba(255, 184, 48, 0.3)',
        },
        // Status colors
        success: '#00FF88',
        danger: '#FF3B5C',
        warning: '#FFB830',
        // Text
        'text-primary': '#E8F4F8',
        'text-secondary': '#7A9BAE',
        'text-muted': '#3D5A6B',
      },
      fontFamily: {
        display: ['Orbitron', 'monospace'],
        hud: ['Rajdhani', 'sans-serif'],
        body: ['Sora', 'sans-serif'],
      },
      backgroundImage: {
        'grid-pattern': `
          linear-gradient(rgba(0, 212, 255, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 212, 255, 0.03) 1px, transparent 1px)
        `,
        'radial-glow': 'radial-gradient(ellipse at center, rgba(0, 212, 255, 0.08) 0%, transparent 70%)',
        'panel-glass': 'linear-gradient(135deg, rgba(13, 17, 23, 0.95) 0%, rgba(17, 24, 39, 0.9) 100%)',
      },
      backgroundSize: {
        'grid-sm': '20px 20px',
        'grid-md': '40px 40px',
      },
      boxShadow: {
        'cyan-glow': '0 0 20px rgba(0, 212, 255, 0.15), 0 0 40px rgba(0, 212, 255, 0.05)',
        'cyan-glow-lg': '0 0 40px rgba(0, 212, 255, 0.2), 0 0 80px rgba(0, 212, 255, 0.1)',
        'amber-glow': '0 0 20px rgba(255, 184, 48, 0.15), 0 0 40px rgba(255, 184, 48, 0.05)',
        'success-glow': '0 0 15px rgba(0, 255, 136, 0.2)',
        'danger-glow': '0 0 15px rgba(255, 59, 92, 0.2)',
        'panel': '0 4px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(0, 212, 255, 0.05)',
        'panel-hover': '0 8px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(0, 212, 255, 0.1)',
      },
      borderColor: {
        'cyan-dim': 'rgba(0, 212, 255, 0.2)',
        'cyan-bright': 'rgba(0, 212, 255, 0.5)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'scan-line': 'scanLine 2s ease-in-out forwards',
        'count-up': 'countUp 1s ease-out forwards',
        'border-flow': 'borderFlow 4s linear infinite',
        'shimmer': 'shimmer 2.5s infinite',
        'blink': 'blink 1.5s step-end infinite',
      },
      keyframes: {
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 212, 255, 0.15), 0 0 40px rgba(0, 212, 255, 0.05)' },
          '50%': { boxShadow: '0 0 30px rgba(0, 212, 255, 0.25), 0 0 60px rgba(0, 212, 255, 0.1)' },
        },
        scanLine: {
          '0%': { transform: 'translateY(-100vh)', opacity: '0.8' },
          '100%': { transform: 'translateY(100vh)', opacity: '0' },
        },
        borderFlow: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}

export default config
