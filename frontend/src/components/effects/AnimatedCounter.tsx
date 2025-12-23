import { useEffect, useState, useRef } from 'react';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

export default function AnimatedCounter({
  value,
  duration = 1500,
  className = '',
  prefix = '',
  suffix = '',
  decimals = 0,
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const previousValue = useRef(0);
  const startTime = useRef<number | null>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const startValue = previousValue.current;
    const endValue = value;
    const difference = endValue - startValue;

    if (difference === 0) return;

    startTime.current = null;

    const animate = (currentTime: number) => {
      if (startTime.current === null) {
        startTime.current = currentTime;
      }

      const elapsed = currentTime - startTime.current;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function: easeOutExpo
      const easeOutExpo = progress === 1 
        ? 1 
        : 1 - Math.pow(2, -10 * progress);

      const currentValue = startValue + difference * easeOutExpo;
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        previousValue.current = endValue;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration]);

  const formattedValue = displayValue.toFixed(decimals);

  return (
    <span className={`tabular-nums ${className}`}>
      {prefix}
      {formattedValue}
      {suffix}
    </span>
  );
}

