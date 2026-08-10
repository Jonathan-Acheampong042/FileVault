/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "var(--color-primary)",
        secondary: "var(--color-secondary)",
        accent: "var(--color-accent)",
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        danger: "var(--color-danger)",
        surface: "var(--color-bg)",
        ink: "var(--color-text)",
        sidebar: "var(--color-sidebar)",
        "sidebar-foreground": "var(--color-sidebar-foreground)",
        "sidebar-border": "var(--color-sidebar-border)",
        "sidebar-primary": "var(--color-sidebar-primary)",
        "sidebar-accent": "var(--color-sidebar-accent)",
        card: "var(--color-card)",
        "card-foreground": "var(--color-card-foreground)",
        "card-border": "var(--color-card-border)",
        muted: "var(--color-muted)",
        "muted-foreground": "var(--color-muted-foreground)",
      },
    },
  },
  plugins: [],
};