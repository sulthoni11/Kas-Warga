/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Palet "Bright Orange Clean" — sama dengan portal warga & aplikasi mobile.
        cream: '#FFF8F2',
        brand: '#F4760A',
        brandLight: '#FFA840',
        brandPastel: '#FFE3C2',
        ink: '#2A2621',
        muted: '#6F665D',
        faint: '#8A8179',
        line: '#F3E7DC',
        sage: {
          50: '#FFF4EA',
          100: '#F3E7DC',
          200: '#FFE6CC',
          300: '#FFD3A8',
          400: '#FFB168',
          500: '#6F665D',
          600: '#5B544C',
          700: '#F4760A',
          900: '#2A2621',
        },
        gold: '#FF8A00',
      },
      borderRadius: {
        card: '22px',
      },
      boxShadow: {
        soft: '0 18px 40px -24px rgba(122, 87, 48, 0.45)',
        lift: '0 10px 24px -14px rgba(244, 118, 10, 0.55)',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
