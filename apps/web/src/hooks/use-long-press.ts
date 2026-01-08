import * as React from "react";

/**
 * Long-press detection hook
 *
 * Detects long-press gestures (500ms threshold by default) for both
 * touch and mouse interactions.
 *
 * @param callback - Function to call when long-press is detected
 * @param options - Configuration options
 *
 * @example
 * ```tsx
 * const longPressHandlers = useLongPress(() => {
 *   console.log('Long press detected!');
 * });
 *
 * return <div {...longPressHandlers}>Press and hold me</div>;
 * ```
 */

export interface UseLongPressOptions {
  /** Duration in ms to detect long press (default: 500ms) */
  threshold?: number;
  /** Callback when long press starts (before threshold) */
  onStart?: () => void;
  /** Callback when press is released before threshold */
  onCancel?: () => void;
  /** Prevent default behavior on touch/mouse events */
  preventDefault?: boolean;
  /** Disable long press detection */
  disabled?: boolean;
}

export interface UseLongPressResult {
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
  onMouseLeave: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onTouchCancel: (e: React.TouchEvent) => void;
}

export function useLongPress(
  callback: () => void,
  options: UseLongPressOptions = {}
): UseLongPressResult {
  const {
    threshold = 500,
    onStart,
    onCancel,
    preventDefault = true,
    disabled = false,
  } = options;

  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = React.useRef(false);
  const startPositionRef = React.useRef<{ x: number; y: number } | null>(null);

  // Movement threshold to cancel long press (in pixels)
  const MOVE_THRESHOLD = 10;

  const clear = React.useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = React.useCallback(
    (clientX: number, clientY: number) => {
      if (disabled) return;

      isLongPressRef.current = false;
      startPositionRef.current = { x: clientX, y: clientY };
      onStart?.();

      clear();
      timerRef.current = setTimeout(() => {
        isLongPressRef.current = true;
        callback();
      }, threshold);
    },
    [callback, threshold, onStart, clear, disabled]
  );

  const cancel = React.useCallback(() => {
    if (timerRef.current && !isLongPressRef.current) {
      onCancel?.();
    }
    clear();
    startPositionRef.current = null;
  }, [clear, onCancel]);

  // Cleanup on unmount
  React.useEffect(
    () => () => {
      clear();
    },
    [clear]
  );

  // Mouse handlers
  const onMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return; // Only left click
      if (preventDefault) {
        e.preventDefault();
      }
      start(e.clientX, e.clientY);
    },
    [start, preventDefault]
  );

  const onMouseUp = React.useCallback(
    (e: React.MouseEvent) => {
      if (preventDefault && isLongPressRef.current) {
        e.preventDefault();
      }
      cancel();
    },
    [cancel, preventDefault]
  );

  const onMouseLeave = React.useCallback(() => {
    cancel();
  }, [cancel]);

  // Touch handlers
  const onTouchStart = React.useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length > 1) {
        cancel();
        return;
      }
      const touch = e.touches[0];
      if (touch) {
        start(touch.clientX, touch.clientY);
      }
    },
    [start, cancel]
  );

  const onTouchEnd = React.useCallback(
    (e: React.TouchEvent) => {
      if (preventDefault && isLongPressRef.current) {
        e.preventDefault();
      }
      cancel();
    },
    [cancel, preventDefault]
  );

  const onTouchCancel = React.useCallback(() => {
    cancel();
  }, [cancel]);

  return {
    onMouseDown,
    onMouseUp,
    onMouseLeave,
    onTouchStart,
    onTouchEnd,
    onTouchCancel,
  };
}

/**
 * Extended long press hook that also handles touch move to cancel
 * when user drags finger away from starting position
 */
export function useLongPressWithMove(
  callback: () => void,
  options: UseLongPressOptions = {}
): UseLongPressResult & { onTouchMove: (e: React.TouchEvent) => void } {
  const {
    threshold = 500,
    onStart,
    onCancel,
    preventDefault = true,
    disabled = false,
  } = options;

  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = React.useRef(false);
  const startPositionRef = React.useRef<{ x: number; y: number } | null>(null);

  const MOVE_THRESHOLD = 10;

  const clear = React.useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = React.useCallback(
    (clientX: number, clientY: number) => {
      if (disabled) return;

      isLongPressRef.current = false;
      startPositionRef.current = { x: clientX, y: clientY };
      onStart?.();

      clear();
      timerRef.current = setTimeout(() => {
        isLongPressRef.current = true;
        callback();
      }, threshold);
    },
    [callback, threshold, onStart, clear, disabled]
  );

  const cancel = React.useCallback(() => {
    if (timerRef.current && !isLongPressRef.current) {
      onCancel?.();
    }
    clear();
    startPositionRef.current = null;
  }, [clear, onCancel]);

  React.useEffect(
    () => () => {
      clear();
    },
    [clear]
  );

  const onMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      if (preventDefault) {
        e.preventDefault();
      }
      start(e.clientX, e.clientY);
    },
    [start, preventDefault]
  );

  const onMouseUp = React.useCallback(
    (e: React.MouseEvent) => {
      if (preventDefault && isLongPressRef.current) {
        e.preventDefault();
      }
      cancel();
    },
    [cancel, preventDefault]
  );

  const onMouseLeave = React.useCallback(() => {
    cancel();
  }, [cancel]);

  const onTouchStart = React.useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length > 1) {
        cancel();
        return;
      }
      const touch = e.touches[0];
      if (touch) {
        start(touch.clientX, touch.clientY);
      }
    },
    [start, cancel]
  );

  const onTouchMove = React.useCallback(
    (e: React.TouchEvent) => {
      if (!startPositionRef.current) return;

      const touch = e.touches[0];
      if (!touch) return;

      const deltaX = Math.abs(touch.clientX - startPositionRef.current.x);
      const deltaY = Math.abs(touch.clientY - startPositionRef.current.y);

      if (deltaX > MOVE_THRESHOLD || deltaY > MOVE_THRESHOLD) {
        cancel();
      }
    },
    [cancel]
  );

  const onTouchEnd = React.useCallback(
    (e: React.TouchEvent) => {
      if (preventDefault && isLongPressRef.current) {
        e.preventDefault();
      }
      cancel();
    },
    [cancel, preventDefault]
  );

  const onTouchCancel = React.useCallback(() => {
    cancel();
  }, [cancel]);

  return {
    onMouseDown,
    onMouseUp,
    onMouseLeave,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel,
  };
}
