import { useRef, useState, ReactNode } from 'react';

interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  strength?: number;
  onClick?: () => void;
}

export default function MagneticButton({
  children,
  className = '',
  strength = 0.3,
  onClick,
}: MagneticButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [transform, setTransform] = useState('translate(0px, 0px)');

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!buttonRef.current) return;
    
    const rect = buttonRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const deltaX = (e.clientX - centerX) * strength;
    const deltaY = (e.clientY - centerY) * strength;
    
    setTransform(`translate(${deltaX}px, ${deltaY}px)`);
  };

  const handleMouseLeave = () => {
    setTransform('translate(0px, 0px)');
  };

  return (
    <button
      ref={buttonRef}
      className={`transition-transform duration-200 ease-out ${className}`}
      style={{ transform }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

