/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          gold: '#D4A843',
          black: '#1A1A1A',
          white: '#FFFFFF',
          gray: '#2D2D2D',
          champagne: '#F5E6CC',
          rose: '#C98BA0',
        },
      },
    },
  },
  plugins: [],
};
