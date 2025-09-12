import { useState, useEffect, useRef, MutableRefObject } from 'react';

interface UseIntersectionObserverOptions {
  threshold?: number | number[];
  rootMargin?: string;
  triggerOnce?: boolean;
  skip?: boolean;
}

interface IntersectionResult {
  isIntersecting: boolean;
  entry: IntersectionObserverEntry | null;
}

export const useIntersectionObserver = (
  options: UseIntersectionObserverOptions = {}
): [MutableRefObject<Element | null>, IntersectionResult] => {
  const {
    threshold = 0,
    rootMargin = '0px',
    triggerOnce = false,
    skip = false
  } = options;

  const elementRef = useRef<Element | null>(null);
  const [result, setResult] = useState<IntersectionResult>({
    isIntersecting: false,
    entry: null
  });

  useEffect(() => {
    if (skip || !elementRef.current) return;

    const element = elementRef.current;
    let hasTriggered = false;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isIntersecting = entry.isIntersecting;

        if (triggerOnce && hasTriggered && !isIntersecting) {
          return;
        }

        if (isIntersecting) {
          hasTriggered = true;
        }

        setResult({
          isIntersecting,
          entry
        });

        // Disconnect after first intersection if triggerOnce is true
        if (triggerOnce && isIntersecting) {
          observer.disconnect();
        }
      },
      {
        threshold,
        rootMargin
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, triggerOnce, skip]);

  return [elementRef, result];
};

// Hook for lazy loading images
export const useLazyImage = (src: string, placeholder?: string) => {
  const [imageSrc, setImageSrc] = useState(placeholder || '');
  const [isLoaded, setIsLoaded] = useState(false);
  const [elementRef, { isIntersecting }] = useIntersectionObserver({
    triggerOnce: true,
    threshold: 0.1
  });

  useEffect(() => {
    if (isIntersecting && src && !isLoaded) {
      const img = new Image();
      img.onload = () => {
        setImageSrc(src);
        setIsLoaded(true);
      };
      img.src = src;
    }
  }, [isIntersecting, src, isLoaded]);

  return {
    elementRef,
    imageSrc,
    isLoaded,
    isIntersecting
  };
};