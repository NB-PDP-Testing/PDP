// Video configuration constants
export const VIDEO_WIDTH = 1920;
export const VIDEO_HEIGHT = 1080;
export const VIDEO_FPS = 30;
export const DURATION_IN_FRAMES = 450; // 15 seconds at 30fps

export const COMP_NAME = "PDPCommercial";

// Color palette matching PlayerARC marketing site
export const COLORS = {
  // Primary brand colors
  primaryBlue: "#1E3A5F", // Main dark blue
  darkBlue: "#0F1F35", // Gradient end darker blue
  green: "#27AE60", // Accent green
  orange: "#F39C12", // CTA orange
  orangeHover: "#E67E22", // Orange hover state
  // Neutrals
  lightGreen: "#F7FAF7", // Light background
  white: "#ffffff",
  gray: "#6B7280",
  lightGray: "#F3F4F6",
};

// Scene timings (in frames)
export const SCENES = {
  intro: { start: 0, duration: 90 }, // 3 seconds
  features: { start: 90, duration: 180 }, // 6 seconds
  benefits: { start: 270, duration: 120 }, // 4 seconds
  cta: { start: 390, duration: 60 }, // 2 seconds
};
