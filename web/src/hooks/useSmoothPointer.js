import { useEffect } from 'react';

export default function useSmoothPointer(containerRef, enabled) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return undefined;

    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    if (!finePointer.matches) return undefined;

    const bounds = container.getBoundingClientRect();
    const target = { x: bounds.width / 2, y: bounds.height * 0.7 };
    const smooth = { ...target };
    let frameId;

    const setPosition = () => {
      container.style.setProperty('--spotlight-x', `${smooth.x}px`);
      container.style.setProperty('--spotlight-y', `${smooth.y}px`);
    };

    const handlePointerMove = (event) => {
      const rect = container.getBoundingClientRect();
      target.x = event.clientX - rect.left;
      target.y = event.clientY - rect.top;
    };

    const animate = () => {
      smooth.x += (target.x - smooth.x) * 0.1;
      smooth.y += (target.y - smooth.y) * 0.1;
      setPosition();
      frameId = window.requestAnimationFrame(animate);
    };

    setPosition();
    container.addEventListener('pointermove', handlePointerMove, { passive: true });
    frameId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frameId);
      container.removeEventListener('pointermove', handlePointerMove);
    };
  }, [containerRef, enabled]);
}
