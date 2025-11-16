import React, { useState, useEffect } from 'react';

const CursorFollower: React.FC = () => {
  const [position, setPosition] = useState({ x: -999, y: -999 });
  const [hue, setHue] = useState(0);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setPosition({ x: event.clientX, y: event.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);

    let animationFrameId: number;
    const animate = () => {
      setHue(prevHue => (prevHue + 0.5) % 360);
      animationFrameId = requestAnimationFrame(animate);
    };
    animationFrameId = requestAnimationFrame(animate);


    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-10"
      style={{
        background: `radial-gradient(400px at ${position.x}px ${position.y}px, rgba(14, 165, 233, 0.15), transparent 80%)`,
        filter: `hue-rotate(${hue}deg)`,
        willChange: 'filter',
      }}
      aria-hidden="true"
    />
  );
};

export default CursorFollower;