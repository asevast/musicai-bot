import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#5B5FC7',
        'primary-light': '#EEF2FF',
        'primary-dark': '#8B5CF6',
        success: '#4ADE80',
        'border-secondary': 'rgba(0,0,0,0.1)',
        'border-tertiary': 'rgba(0,0,0,0.05)',
      },
      fontFamily: {
        sans: ['-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
