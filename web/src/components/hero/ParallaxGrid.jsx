import { useEffect, useRef } from 'react';

export default function ParallaxGrid({ disabled }) {
  const gridRef = useRef(null);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid || disabled) return undefined;

    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    if (!finePointer.matches) return undefined;

    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let frameId;

    const handlePointerMove = (event) => {
      const rect = grid.parentElement.getBoundingClientRect();
      target.x = ((event.clientX - rect.left - rect.width / 2) / rect.width) * 16;
      target.y = ((event.clientY - rect.top - rect.height / 2) / rect.height) * 16;
    };

    const animate = () => {
      current.x += (target.x - current.x) * 0.06;
      current.y += (target.y - current.y) * 0.06;
      grid.style.transform = `translate3d(${current.x}px, ${current.y}px, 0)`;
      frameId = window.requestAnimationFrame(animate);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    frameId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, [disabled]);

  return (
    <svg ref={gridRef} className="hero-grid" aria-hidden="true">
      <defs>
        <pattern id="sehat-grid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#64748b" strokeWidth="0.6" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#sehat-grid)" />
    </svg>
  );
}
