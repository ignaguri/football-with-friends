/**
 * Color constants for the application
 * These colors can be used across all components
 */

export const colors = {
  // Custom Navy Blue for Phone Sign-In
  navyBlue: "#486284",
  navyBlueHover: "#6D819D", // 20% lighter for hover state
} as const;

export type ColorKey = keyof typeof colors;
