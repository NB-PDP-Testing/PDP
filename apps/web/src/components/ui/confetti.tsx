"use client";

import { useEffect, useState } from "react";

/**
 * Confetti animation component for celebration UI
 * Displays animated confetti pieces that fall from the top of the screen
 */
export function Confetti() {
  const [pieces, setPieces] = useState<
    Array<{ id: number; left: number; delay: number; duration: number; color: string; size: number }>
  >([]);

  useEffect(() => {
    // Generate confetti pieces on mount
    const colors = [
      "#22c55e", // Green
      "#1e3a5f", // Navy
      "#FFD700", // Gold
      "#FF6B6B", // Coral
      "#4ECDC4", // Teal
      "#A78BFA", // Purple
      "#F472B6", // Pink
    ];

    const newPieces = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 3 + Math.random() * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 8 + Math.random() * 8,
    }));

    setPieces(newPieces);
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
      data-testid="confetti"
    >
      {pieces.map((piece) => (
        <div
          key={piece.id}
          style={{
            position: "absolute",
            left: `${piece.left}%`,
            top: "-20px",
            width: `${piece.size}px`,
            height: `${piece.size}px`,
            backgroundColor: piece.color,
            borderRadius: "2px",
            opacity: 0.9,
            animation: `confetti-fall ${piece.duration}s ease-in-out ${piece.delay}s forwards`,
          }}
        />
      ))}
      {/* Inline keyframes for the animation */}
      <style
        // biome-ignore lint/security/noDangerouslySetInnerHtml: Safe static CSS animation
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes confetti-fall {
              0% {
                transform: translateY(0) rotate(0deg);
                opacity: 1;
              }
              100% {
                transform: translateY(100vh) rotate(720deg);
                opacity: 0;
              }
            }
          `,
        }}
      />
    </div>
  );
}
