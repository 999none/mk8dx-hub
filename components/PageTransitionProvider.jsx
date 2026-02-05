'use client';

import { useEffect, useState, useRef, createContext, useContext } from 'react';
import { usePathname } from 'next/navigation';

// Context for transition control
const TransitionContext = createContext({
  isTransitioning: false,
  transitionType: 'blur',
  setTransitionType: () => {},
});

export const usePageTransition = () => useContext(TransitionContext);

/**
 * PageTransitionProvider
 * Provides smooth page transitions with various animation types
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Page content to animate
 * @param {string} props.transitionType - Animation type: 'fade' | 'slide-up' | 'slide-left' | 'slide-right' | 'blur' | 'scale' | 'none'
 * @param {number} props.duration - Animation duration in ms (default: 400)
 */
export default function PageTransitionProvider({ 
  children, 
  transitionType: initialType = 'blur',
  duration = 400,
}) {
  const pathname = usePathname();
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [transitionType, setTransitionType] = useState(initialType);
  const prevPathRef = useRef(pathname);
  const isFirstMount = useRef(true);

  // Custom easing (expo out)
  const easing = 'cubic-bezier(0.16, 1, 0.3, 1)';

  // Animation styles based on type
  const getAnimationStyles = (type, state) => {
    const transforms = {
      initial: {
        'fade': { opacity: 0 },
        'slide-up': { opacity: 0, transform: 'translateY(24px)' },
        'slide-down': { opacity: 0, transform: 'translateY(-24px)' },
        'slide-left': { opacity: 0, transform: 'translateX(24px)' },
        'slide-right': { opacity: 0, transform: 'translateX(-24px)' },
        'blur': { opacity: 0, filter: 'blur(12px)', transform: 'translateY(10px)' },
        'scale': { opacity: 0, transform: 'scale(0.96)' },
        'scale-blur': { opacity: 0, filter: 'blur(8px)', transform: 'scale(0.97)' },
        'zoom-in': { opacity: 0, transform: 'scale(1.05)' },
        'zoom-out': { opacity: 0, transform: 'scale(0.9)' },
        'none': {},
      },
      final: {
        'fade': { opacity: 1 },
        'slide-up': { opacity: 1, transform: 'translateY(0)' },
        'slide-down': { opacity: 1, transform: 'translateY(0)' },
        'slide-left': { opacity: 1, transform: 'translateX(0)' },
        'slide-right': { opacity: 1, transform: 'translateX(0)' },
        'blur': { opacity: 1, filter: 'blur(0px)', transform: 'translateY(0)' },
        'scale': { opacity: 1, transform: 'scale(1)' },
        'scale-blur': { opacity: 1, filter: 'blur(0px)', transform: 'scale(1)' },
        'zoom-in': { opacity: 1, transform: 'scale(1)' },
        'zoom-out': { opacity: 1, transform: 'scale(1)' },
        'none': {},
      },
    };

    return transforms[state][type] || transforms[state].fade;
  };

  // Handle route changes
  useEffect(() => {
    if (pathname !== prevPathRef.current) {
      // Route changed - start transition
      setIsTransitioning(true);
      prevPathRef.current = pathname;
      
      // Use requestAnimationFrame for smooth animation start
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsTransitioning(false);
        });
      });
    }
  }, [pathname]);

  // Initial mount animation
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      // Small delay for initial render
      const timer = setTimeout(() => {
        requestAnimationFrame(() => {
          setIsTransitioning(false);
        });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, []);

  const containerStyle = {
    transition: `opacity ${duration}ms ${easing}, transform ${duration}ms ${easing}, filter ${duration}ms ${easing}`,
    willChange: 'opacity, transform, filter',
    ...getAnimationStyles(transitionType, isTransitioning ? 'initial' : 'final'),
  };

  return (
    <TransitionContext.Provider value={{ isTransitioning, transitionType, setTransitionType }}>
      <div 
        className="page-transition-wrapper min-h-screen"
        style={containerStyle}
      >
        {children}
      </div>
    </TransitionContext.Provider>
  );
}
