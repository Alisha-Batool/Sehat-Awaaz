import { useEffect, useState } from 'react';

const FRONT_VIDEO = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260713_162101_0d7498c5-29bb-47bf-a99f-2773c0a880a9.mp4';
const RADIUS = 260;

export default function SpotlightReveal({ disabled }) {
  const [maskImage, setMaskImage] = useState('');
  const [videoFailed, setVideoFailed] = useState(false);
  const [finePointer, setFinePointer] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setFinePointer(media.matches);

    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    const size = RADIUS * 2;
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(RADIUS, RADIUS, 0, RADIUS, RADIUS, RADIUS);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.75)');
    gradient.addColorStop(0.75, 'rgba(255, 255, 255, 0.4)');
    gradient.addColorStop(0.88, 'rgba(255, 255, 255, 0.12)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);

    setMaskImage(canvas.toDataURL());
  }, []);

  const active = finePointer && !disabled && !videoFailed && Boolean(maskImage);
  const maskStyles = active
    ? {
        WebkitMaskImage: `url(${maskImage})`,
        maskImage: `url(${maskImage})`,
        WebkitMaskPosition: 'calc(var(--spotlight-x) - 260px) calc(var(--spotlight-y) - 260px)',
        maskPosition: 'calc(var(--spotlight-x) - 260px) calc(var(--spotlight-y) - 260px)',
      }
    : undefined;

  return (
    <div className={`spotlight-reveal ${active ? 'is-active' : ''}`} style={maskStyles} aria-hidden="true">
      <video
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        onError={() => setVideoFailed(true)}
      >
        <source src={FRONT_VIDEO} type="video/mp4" />
      </video>
    </div>
  );
}
