import { useRef } from 'react';
import ParallaxGrid from './ParallaxGrid';
import SpotlightReveal from './SpotlightReveal';
import useReducedMotion from '../../hooks/useReducedMotion';
import useSmoothPointer from '../../hooks/useSmoothPointer';

const BG_IMAGE = 'https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260713_140344_79e1296a-86d7-43fd-9b5f-63ffe560f291.png&w=1280&q=85';
const OVERLAY_IMAGE = 'https://soft-zoom-63098134.figma.site/_assets/v11/3f10f1876e118f72a396e05a6c2d099569478272.png';

export default function HeroSection({ children }) {
  const sectionRef = useRef(null);
  const reducedMotion = useReducedMotion();

  useSmoothPointer(sectionRef, !reducedMotion);

  return (
    <section ref={sectionRef} className="hero font-helvetica-neue">
      <ParallaxGrid disabled={reducedMotion} />
      <div className="hero-background" style={{ backgroundImage: `url("${BG_IMAGE}")` }} aria-hidden="true" />
      <h1 className="hero-title">Sehat Awaaz</h1>
      <img className="hero-overlay" src={OVERLAY_IMAGE} alt="" aria-hidden="true" />
      <SpotlightReveal disabled={reducedMotion} />
      <div className="hero-content">{children}</div>
    </section>
  );
}
