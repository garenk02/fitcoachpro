import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary Palette (Section 3.1)
        primary: {
          DEFAULT: "#2563EB", // Primary Blue
          foreground: "#FFFFFF",
          hover: "#1D4ED8", // 10% darker for hover states
        },
        secondary: {
          DEFAULT: "#10B981", // Secondary Green
          foreground: "#FFFFFF",
          hover: "#059669", // 10% darker for hover states
        },
        neutral: {
          DEFAULT: "#F3F4F6", // Neutral Gray
        },
        
        // Accent Palette (Section 3.2)
        energy: {
          DEFAULT: "#F97316", // Energy Orange
          hover: "#EA580C", // 10% darker for hover states
        },
        warning: {
          DEFAULT: "#EF4444", // Warning Red
          hover: "#DC2626", // 10% darker for hover states
        },
        
        // Neutral Palette (Section 3.3)
        dark: "#1F2A44", // Dark Gray
        mid: "#6B7280", // Mid Gray
        light: "#E5E7EB", // Light Gray
        white: "#FFFFFF", // White
        
        // UI Colors
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        "card-foreground": "var(--card-foreground)",
        popover: "var(--popover)",
        "popover-foreground": "var(--popover-foreground)",
        muted: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",
        accent: "var(--accent)",
        "accent-foreground": "var(--accent-foreground)",
        destructive: "var(--destructive)",
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "sans-serif"],
        heading: ["var(--font-heading)", "Poppins", "sans-serif"],
      },
      fontSize: {
        // Typography Scale (Section 2.2)
        h1: ["28px", { lineHeight: "36px", fontWeight: 700 }], // Poppins Bold
        h2: ["22px", { lineHeight: "28px", fontWeight: 500 }], // Poppins Medium
        h3: ["18px", { lineHeight: "24px", fontWeight: 500 }], // Inter Medium
        body: ["16px", { lineHeight: "22px", fontWeight: 400 }], // Inter Regular
        small: ["14px", { lineHeight: "20px", fontWeight: 400 }], // Inter Regular
        cta: ["16px", { lineHeight: "22px", fontWeight: 500 }], // Poppins Medium
      },
      spacing: {
        // Layout Spacing (Section 5)
        mobile: "16px", // Mobile spacing between sections
        desktop: "24px", // Desktop spacing between sections
        element: {
          mobile: "8px", // Mobile spacing between elements
          desktop: "12px", // Desktop spacing between elements
        },
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        DEFAULT: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
        md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
      },
      animation: {
        // Animations (Section 6.3)
        "fade-in": "fadeIn 200ms ease-out",
        "slide-up": "slideUp 300ms ease-out",
        "pulse": "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: ".5" },
        },
      },
      screens: {
        // Responsive Breakpoints (Section 5.3)
        "sm-mobile": "320px",
        "lg-mobile": "481px",
        "tablet": "769px",
        "desktop": "1025px",
      },
    },
  },
  plugins: [],
};

export default config;
