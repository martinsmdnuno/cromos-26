/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Mirrors PALETTE in @cromos/shared.
        panini: {
          red: '#E63027',
          orange: '#F2812A',
          yellow: '#F4C430',
          green: '#6FBE44',
          teal: '#2FB8AB',
          blue: '#2E6FB8',
          navy: '#1B3A6B',
          purple: '#7B4B9E',
          cream: '#F5E6D3',
          ink: '#1A1A1A',
        },
      },
      fontFamily: {
        display: ['Anton', 'Bebas Neue', 'Impact', 'sans-serif'],
        body: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Space Mono"', 'monospace'],
      },
      borderWidth: {
        3: '3px',
      },
      borderRadius: {
        pill: '999px',
      },
    },
  },
  plugins: [],
};
