// Create a theme constants file for consistent colors across charts
export const CHART_COLORS = {
    // Primary colors from the app's theme
    primary: "#ffd428", // Yellow/gold - primary brand color
    primaryDark: "#e6b800",
    secondary: "#242a37", // Dark blue/gray - secondary color

    // Chart palette - complementary to the app's theme
    blue: "#3b82f6",
    green: "#10b981",
    yellow: "#ffd428",
    orange: "#f97316",
    red: "#ef4444",
    purple: "#8b5cf6",
    teal: "#14b8a6",
    indigo: "#6366f1",

    // Background colors for charts
    backgroundLight: "rgba(255, 212, 40, 0.1)",
    backgroundMedium: "rgba(255, 212, 40, 0.2)",

    // Gradient stops
    gradientFrom: "rgba(255, 212, 40, 0.8)",
    gradientTo: "rgba(255, 212, 40, 0.1)",
    gradientBlueFrom: "rgba(59, 130, 246, 0.8)",
    gradientBlueTo: "rgba(59, 130, 246, 0.1)",
    gradientGreenFrom: "rgba(16, 185, 129, 0.8)",
    gradientGreenTo: "rgba(16, 185, 129, 0.1)",
}

// Chart theme settings
export const CHART_THEME = {
    // Common chart settings
    fontSize: 12,
    fontFamily: "inherit",

    // Responsive breakpoints
    breakpoints: {
        mobile: 640,
        tablet: 768,
        desktop: 1024,
    },

    // Animation durations
    animation: {
        duration: 1000,
        easing: "ease",
    },
}
