// Video configuration constants
export const VIDEO_WIDTH = 1920;
export const VIDEO_HEIGHT = 1080;
export const VIDEO_FPS = 30;
export const DURATION_IN_FRAMES = 750; // 25 seconds at 30fps

export const COMP_NAME = "PDPCommercial";

// Color palette matching PlayerARC marketing site
export const COLORS = {
  // Primary brand colors
  primaryBlue: "#1E3A5F", // Main dark blue
  darkBlue: "#0F1F35", // Gradient end darker blue
  green: "#27AE60", // Accent green
  orange: "#F39C12", // CTA orange
  orangeHover: "#E67E22", // Orange hover state
  // Status colors
  red: "#EF4444",
  yellow: "#F59E0B",
  // Neutrals
  lightGreen: "#F7FAF7", // Light background
  white: "#ffffff",
  gray: "#6B7280",
  lightGray: "#F3F4F6",
};

// Scene timings (in frames) - 25 second commercial
export const SCENES = {
  intro: { start: 0, duration: 120 }, // 4 seconds - Logo reveal
  problem: { start: 120, duration: 150 }, // 5 seconds - Stats/crisis
  solution: { start: 270, duration: 120 }, // 4 seconds - Passport solution
  features: { start: 390, duration: 150 }, // 5 seconds - Key features
  benefits: { start: 540, duration: 120 }, // 4 seconds - Value props
  cta: { start: 660, duration: 90 }, // 3 seconds - Call to action
};

// Crisis stats from marketing site research
export const STATS = [
  { value: "70%", label: "Drop out by age 13", color: "#EF4444" },
  { value: "35%", label: "Cite burnout", color: "#F59E0B" },
  { value: "85%", label: "Still love the game", color: "#27AE60" },
];
