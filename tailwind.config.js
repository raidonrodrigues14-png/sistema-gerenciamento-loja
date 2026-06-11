/** @type {import('tailwindcss').Config} */

// Paleta remapeada para o tema "Super Bonita" (dark & luxe):
// - white  -> superfície escura dos cards
// - slate  -> tons quentes de cinza-escuro / texto claro
// - violet -> dourado champanhe (acento)
module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Hanken Grotesk", "system-ui", "sans-serif"],
        serif: ["Playfair Display", "Georgia", "serif"],
      },
      colors: {
        white: "#242120",
        slate: {
          50: "#2d2a27",
          100: "#1f1d1b",
          200: "#393530",
          300: "#46413b",
          400: "#847d70",
          500: "#a39b8d",
          600: "#b7b0a4",
          700: "#d2ccc0",
          800: "#e6e1d6",
          900: "#f7f4ec",
          950: "#151312",
        },
        violet: {
          50: "#2e2a20",
          100: "#3a3322",
          200: "#574a2c",
          300: "#a98e54",
          400: "#c2a865",
          500: "#d4b878",
          600: "#c9a961",
          700: "#ddc189",
          800: "#e7d3a6",
          900: "#f0e2c4",
          950: "#161311",
        },
        emerald: {
          50: "#1c2a22",
          100: "#21352a",
          200: "#2c4837",
          300: "#4d8a68",
          500: "#6fc79c",
          600: "#7fd0a8",
          700: "#8fd7b2",
        },
        amber: {
          50: "#322a1b",
          100: "#3b3220",
          200: "#56482b",
          500: "#d8b36a",
          600: "#d0a85c",
          700: "#ddb874",
        },
        red: {
          50: "#33201c",
          100: "#3e2520",
          200: "#5a322a",
          300: "#d98a7c",
          500: "#e08573",
          600: "#e58d7b",
          700: "#eb9a89",
        },
        blue: {
          100: "#20303a",
          600: "#8db7d8",
        },
        pink: {
          100: "#392428",
          600: "#d99aa8",
        },
      },
    },
  },
  plugins: [],
};
