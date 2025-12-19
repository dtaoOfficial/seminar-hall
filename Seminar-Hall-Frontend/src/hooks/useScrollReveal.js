// src/hooks/useScrollReveal.js
import { useInView } from "framer-motion";
import { useRef } from "react";

/**
 * Modern Smooth Reveal Component
 * Wrap your elements with this instead of just using data-reveal
 */
export const Reveal = ({ children, delay = 0, x = 0, y = 20 }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <div
      ref={ref}
      style={{
        transform: isInView ? "none" : `translateX(${x}px) translateY(${y}px)`,
        opacity: isInView ? 1 : 0,
        transition: `all 0.9s cubic-bezier(0.17, 0.55, 0.55, 1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
};

// Keep this empty export if you are still calling it elsewhere to prevent breakages
export default function useScrollReveal() {
  return null; 
}