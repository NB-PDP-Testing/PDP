"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Props for LazyComponent
 */
export interface LazyComponentProps {
  /** Children to render when visible */
  children: React.ReactNode;
  /** Root margin for intersection observer */
  rootMargin?: string;
  /** Placeholder to show before component is visible */
  placeholder?: React.ReactNode;
  /** Minimum height to reserve for the component */
  minHeight?: number | string;
  /** Custom class name */
  className?: string;
  /** Whether to keep mounted after becoming visible */
  keepMounted?: boolean;
}

/**
 * LazyComponent - Render children only when visible in viewport
 *
 * Features:
 * - Uses Intersection Observer for efficient detection
 * - Shows placeholder while loading
 * - Configurable root margin for preloading
 */
export function LazyComponent({
  children,
  rootMargin = "100px",
  placeholder,
  minHeight,
  className,
  keepMounted = true,
}: LazyComponentProps) {
  const [hasBeenVisible, setHasBeenVisible] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (
      !ref.current ||
      hasBeenVisible ||
      typeof IntersectionObserver === "undefined"
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasBeenVisible(true);
          if (keepMounted) {
            observer.disconnect();
          }
        }
      },
      { rootMargin }
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [hasBeenVisible, rootMargin, keepMounted]);

  const defaultPlaceholder = (
    <div style={{ minHeight: minHeight || 100 }}>
      <Skeleton className="h-full min-h-[100px] w-full" />
    </div>
  );

  return (
    <div
      className={className}
      ref={ref}
      style={{ minHeight: hasBeenVisible ? undefined : minHeight }}
    >
      {hasBeenVisible ? children : placeholder || defaultPlaceholder}
    </div>
  );
}

/**
 * Props for LazyImage
 */
export interface LazyImageProps
  extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Placeholder to show while loading */
  placeholder?: React.ReactNode;
  /** Root margin for preloading */
  rootMargin?: string;
}

/**
 * LazyImage - Load images only when visible
 */
export function LazyImage({
  src,
  alt,
  placeholder,
  rootMargin = "200px",
  className,
  ...props
}: LazyImageProps) {
  const [hasBeenVisible, setHasBeenVisible] = React.useState(false);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (
      !ref.current ||
      hasBeenVisible ||
      typeof IntersectionObserver === "undefined"
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasBeenVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [hasBeenVisible, rootMargin]);

  const defaultPlaceholder = (
    <Skeleton className={cn("h-full w-full", className)} />
  );

  return (
    <div className="relative" ref={ref}>
      {hasBeenVisible ? (
        <>
          {!isLoaded && (placeholder || defaultPlaceholder)}
          <img
            alt={alt}
            className={cn(className, !isLoaded && "absolute opacity-0")}
            onLoad={() => setIsLoaded(true)}
            src={src}
            {...props}
          />
        </>
      ) : (
        placeholder || defaultPlaceholder
      )}
    </div>
  );
}

/**
 * Props for DeferredRender
 */
export interface DeferredRenderProps {
  /** Children to render after delay */
  children: React.ReactNode;
  /** Delay in milliseconds */
  delay?: number;
  /** Placeholder to show during delay */
  placeholder?: React.ReactNode;
}

/**
 * DeferredRender - Defer rendering to prevent blocking
 *
 * Useful for non-critical UI elements
 */
export function DeferredRender({
  children,
  delay = 0,
  placeholder = null,
}: DeferredRenderProps) {
  const [shouldRender, setShouldRender] = React.useState(delay === 0);

  React.useEffect(() => {
    if (delay === 0) return;

    const timeoutId = setTimeout(() => {
      setShouldRender(true);
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [delay]);

  return shouldRender ? <>{children}</> : <>{placeholder}</>;
}

/**
 * Props for IdleRender
 */
export interface IdleRenderProps {
  /** Children to render during idle time */
  children: React.ReactNode;
  /** Placeholder to show before idle */
  placeholder?: React.ReactNode;
  /** Timeout for requestIdleCallback */
  timeout?: number;
}

/**
 * IdleRender - Render during browser idle time
 */
export function IdleRender({
  children,
  placeholder = null,
  timeout = 2000,
}: IdleRenderProps) {
  const [shouldRender, setShouldRender] = React.useState(false);

  React.useEffect(() => {
    const idleCallback =
      typeof window !== "undefined" && "requestIdleCallback" in window
        ? window.requestIdleCallback
        : (cb: IdleRequestCallback) =>
            setTimeout(
              () => cb({ didTimeout: false, timeRemaining: () => 50 }),
              1
            );

    const cancelCallback =
      typeof window !== "undefined" && "cancelIdleCallback" in window
        ? window.cancelIdleCallback
        : clearTimeout;

    const handle = idleCallback(() => setShouldRender(true), { timeout });

    return () => cancelCallback(handle as number);
  }, [timeout]);

  return shouldRender ? <>{children}</> : <>{placeholder}</>;
}
