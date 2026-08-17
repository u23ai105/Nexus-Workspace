import { useState, useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';

/**
 * A reusable hook to track the width of a specific container using ResizeObserver.
 * Use this only when JavaScript behavior genuinely depends on available width 
 * (e.g. deciding how many panels to render inline vs as overlays).
 */
export function useContainerSize<T extends HTMLElement = HTMLDivElement>(): [MutableRefObject<T | null>, number] {
  const [width, setWidth] = useState<number>(0);
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const target = ref.current;
    if (!target) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentBoxSize) {
          // Firefox implements `contentBoxSize` as a single content rect, rather than an array
          const contentBoxSize = Array.isArray(entry.contentBoxSize) ? entry.contentBoxSize[0] : entry.contentBoxSize;
          // Add inlineSize (width) to calculate available width. Fallback to contentRect.
          setWidth(contentBoxSize?.inlineSize || entry.contentRect.width);
        } else {
          setWidth(entry.contentRect.width);
        }
      }
    });

    resizeObserver.observe(target);
    
    // Initial measure
    setWidth(target.getBoundingClientRect().width);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return [ref, width];
}
