import { useCallback, useRef } from "react";

type LongPressHandlers = {
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  onTouchMove: (e: React.TouchEvent) => void;
};

export function useLongPress(
  onLongPress: () => void,
  delay = 500
): LongPressHandlers {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  const clear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    startPosRef.current = null;
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      startPosRef.current = { x: e.clientX, y: e.clientY };
      timeoutRef.current = setTimeout(() => {
        onLongPress();
        clear();
      }, delay);
    },
    [onLongPress, delay, clear]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (startPosRef.current) {
        const dx = e.clientX - startPosRef.current.x;
        const dy = e.clientY - startPosRef.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Cancel if moved more than 10px
        if (distance > 10) {
          clear();
        }
      }
    },
    [clear]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      if (touch) {
        startPosRef.current = { x: touch.clientX, y: touch.clientY };
        timeoutRef.current = setTimeout(() => {
          onLongPress();
          clear();
        }, delay);
      }
    },
    [onLongPress, delay, clear]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      if (touch && startPosRef.current) {
        const dx = touch.clientX - startPosRef.current.x;
        const dy = touch.clientY - startPosRef.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Cancel if moved more than 10px
        if (distance > 10) {
          clear();
        }
      }
    },
    [clear]
  );

  // Add mouse move listener
  useCallback(() => {
    document.addEventListener("mousemove", handleMouseMove);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, [handleMouseMove]);

  return {
    onMouseDown: handleMouseDown,
    onMouseUp: clear,
    onMouseLeave: clear,
    onTouchStart: handleTouchStart,
    onTouchEnd: clear,
    onTouchMove: handleTouchMove,
  };
}
