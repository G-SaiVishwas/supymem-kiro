import { useEffect, useRef, useCallback } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  color: string;
}

interface ParticleFieldProps {
  particleCount?: number;
  connectionDistance?: number;
  className?: string;
}

const colors = ['#00d4ff', '#a855f7', '#ec4899', '#10b981'];

export default function ParticleField({
  particleCount = 50,
  connectionDistance = 120,
  className = '',
}: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const animationRef = useRef<number>();

  const initParticles = useCallback((width: number, height: number) => {
    const particles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.2,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    particlesRef.current = particles;
  }, [particleCount]);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    const particles = particlesRef.current;
    const mouse = mouseRef.current;

    // Update and draw particles
    particles.forEach((particle, i) => {
      // Mouse attraction
      const dx = mouse.x - particle.x;
      const dy = mouse.y - particle.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < 200) {
        const force = (200 - dist) / 200 * 0.02;
        particle.vx += dx * force * 0.01;
        particle.vy += dy * force * 0.01;
      }

      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;

      // Friction
      particle.vx *= 0.99;
      particle.vy *= 0.99;

      // Bounce off edges
      if (particle.x < 0 || particle.x > width) particle.vx *= -1;
      if (particle.y < 0 || particle.y > height) particle.vy *= -1;

      // Keep in bounds
      particle.x = Math.max(0, Math.min(width, particle.x));
      particle.y = Math.max(0, Math.min(height, particle.y));

      // Draw particle with glow
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fillStyle = particle.color;
      ctx.globalAlpha = particle.opacity;
      ctx.fill();

      // Add glow effect
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius * 3, 0, Math.PI * 2);
      const gradient = ctx.createRadialGradient(
        particle.x, particle.y, 0,
        particle.x, particle.y, particle.radius * 3
      );
      gradient.addColorStop(0, particle.color + '40');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.globalAlpha = particle.opacity * 0.5;
      ctx.fill();

      // Draw connections
      for (let j = i + 1; j < particles.length; j++) {
        const other = particles[j];
        const dx = particle.x - other.x;
        const dy = particle.y - other.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < connectionDistance) {
          ctx.beginPath();
          ctx.moveTo(particle.x, particle.y);
          ctx.lineTo(other.x, other.y);
          ctx.strokeStyle = particle.color;
          ctx.globalAlpha = (1 - distance / connectionDistance) * 0.15;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    });

    ctx.globalAlpha = 1;
    animationRef.current = requestAnimationFrame(animate);
  }, [connectionDistance]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
        initParticles(canvas.width, canvas.height);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [initParticles, animate]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-auto ${className}`}
      style={{ opacity: 0.6 }}
    />
  );
}

