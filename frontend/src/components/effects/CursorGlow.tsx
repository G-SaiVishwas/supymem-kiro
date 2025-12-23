import { useEffect, useState, useRef } from 'react';

export default function CursorGlow() {
  const [position, setPosition] = useState({ x: -500, y: -500 });
  const [isVisible, setIsVisible] = useState(false);
  const rafRef = useRef<number>();
  const targetRef = useRef({ x: -500, y: -500 });
  const currentRef = useRef({ x: -500, y: -500 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      targetRef.current = { x: e.clientX, y: e.clientY };
      setIsVisible(true);
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    // Smooth animation loop
    const animate = () => {
      const lerp = 0.1;
      currentRef.current.x += (targetRef.current.x - currentRef.current.x) * lerp;
      currentRef.current.y += (targetRef.current.y - currentRef.current.y) * lerp;
      setPosition({ ...currentRef.current });
      rafRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.body.addEventListener('mouseleave', handleMouseLeave);
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.body.removeEventListener('mouseleave', handleMouseLeave);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      className="fixed pointer-events-none z-0 transition-opacity duration-300"
      style={{
        left: position.x,
        top: position.y,
        width: 500,
        height: 500,
        transform: 'translate(-50%, -50%)',
        background: `radial-gradient(circle, rgba(0, 212, 255, 0.08) 0%, rgba(168, 85, 247, 0.04) 40%, transparent 70%)`,
        opacity: isVisible ? 1 : 0,
        filter: 'blur(1px)',
      }}
    />
  );
}

