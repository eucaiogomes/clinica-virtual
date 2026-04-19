/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        psi: {
          50:  '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        // Paleta quiz / exercícios terapêuticos
        cream:     '#F8F4EF',
        sage:      '#7A9E8A',
        'sage-dk': '#4C7A60',
        terra:     '#C4785A',
        'terra-lt':'#E8A98C',
        gold:      '#C9A96E',
        'quiz-bg': '#1e2820',
      },
    },
  },
  plugins: [],
}
