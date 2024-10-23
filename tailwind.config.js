/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "main-red": "#CC1316",
        "light-gray": "#E9ECEF",

        // contentBrandPrimaryMedium: 'black',
      },
    }
  },
  plugins: [],
}