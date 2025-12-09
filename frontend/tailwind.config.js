/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        owned: '#10b981',
        unowned: '#ef4444',
      }
    },
  },
  plugins: [],
}
