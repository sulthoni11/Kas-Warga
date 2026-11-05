/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Soft aesthetic theme (PRD §12)
        cream: '#FBF7F0',
        sage: {
          50: '#F2F6F2',
          100: '#E1EBE2',
          300: '#B4CBB6',
          500: '#7FA383',
          700: '#4E6B52',
          900: '#2C3D2F',
        },
        gold: '#C7A76B',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
