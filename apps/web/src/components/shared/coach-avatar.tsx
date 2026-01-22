"use client";

// Regex pattern for splitting names by whitespace
const WHITESPACE_REGEX = /\s+/;

type CoachAvatarProps = {
  coachName: string;
  size?: "sm" | "md" | "lg";
};

/**
 * CoachAvatar component displays coach initials in a circular avatar
 * @param coachName - Full name of the coach (e.g., "John Smith")
 * @param size - Size variant: 'sm' | 'md' | 'lg' (default: 'md')
 */
export default function CoachAvatar({
  coachName,
  size = "md",
}: CoachAvatarProps) {
  // Extract initials from coach name
  const getInitials = (name: string): string => {
    if (!name || name.trim() === "") {
      return "?";
    }

    const parts = name.trim().split(WHITESPACE_REGEX);

    if (parts.length === 1) {
      // Single name: take first letter
      return parts[0].charAt(0).toUpperCase();
    }

    // Multiple names: take first letter of first and last name
    const firstInitial = parts[0].charAt(0).toUpperCase();
    const lastInitial = (parts.at(-1) || "").charAt(0).toUpperCase();
    return `${firstInitial}${lastInitial}`;
  };

  // Size class mapping
  const sizeClasses = {
    sm: "h-8 w-8 text-sm",
    md: "h-10 w-10 text-base",
    lg: "h-12 w-12 text-lg",
  };

  const initials = getInitials(coachName);

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-primary/10 font-medium text-primary ${sizeClasses[size]}`}
    >
      {initials}
    </div>
  );
}
