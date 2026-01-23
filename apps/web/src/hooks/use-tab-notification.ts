"use client";

import { useEffect, useRef } from "react";

/**
 * Hook to update browser tab title with unread count
 * @param unreadCount - Number of unread items to display
 */
export function useTabNotification(unreadCount: number) {
  const originalTitleRef = useRef<string>("");

  useEffect(() => {
    // Store original title on mount
    if (!originalTitleRef.current) {
      originalTitleRef.current = document.title;
    }

    // Update title with count
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) Messages | PlayerARC`;
    } else {
      document.title = originalTitleRef.current || "PlayerARC";
    }

    // Restore original title on unmount
    return () => {
      if (originalTitleRef.current) {
        document.title = originalTitleRef.current;
      }
    };
  }, [unreadCount]);
}
