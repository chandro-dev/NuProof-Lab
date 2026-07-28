/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ink: "#17151C",
        muted: "#6B6673",
        line: "#E8E5EB",
        surface: "#F7F6F8",
        brand: "#6D28D9",
        "brand-dark": "#4C1D95",
        success: "#087A55",
        "success-soft": "#E8F7F1",
        warning: "#A14F08",
        "warning-soft": "#FFF4DE",
        danger: "#B42318",
        "danger-soft": "#FDECEA"
      }
    }
  },
  plugins: []
};

