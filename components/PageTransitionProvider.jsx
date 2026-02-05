'use client';

import { useEffect, useState, useRef, createContext, useContext } from 'react';
import { usePathname } from 'next/navigation';

// Context for transition control
const TransitionContext = createContext({
  isTransitioning: false,
  transitionType: 'fade',
  setTransitionType: () => {},
});

export const usePageTransition = () => useContext(TransitionContext);

/**
 * PageTransitionProvider
 * Provides smooth page transitions with various animation types
 * IMPORTANT: Using fade-only to prevent click/interaction issues
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Page content to animate
 * @param {string} props.transitionType - Animation type: 'fade' | 'slide-up' | 'none'
 * @param {number} props.duration - Animation duration in ms (default: 300)
 */
export default function PageTransitionProvider({ 
  children, 
  transitionType: initialType = 'fade',
  duration = 300,
}) {
  const pathname = usePathname();
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [transitionType, setTransitionType] = useState(initialType);
  const prevPathRef = useRef(pathname);
  const isFirstMount = useRef(true);

  // Custom easing (expo out)
  const easing = 'cubic-bezier(0.16, 1, 0.3, 1)';

  // Animation styles based on type - simplified to avoid interaction issues
  const getAnimationStyles = (type, state) => {
    const transforms = {
      initial: {
        'fade': { opacity: 0 },
        'slide-up': { opacity: 0, transform: 'translateY(16px)' },
        'none': {},
      },
      final: {
        'fade': { opacity: 1 },
        'slide-up': { opacity: 1, transform: 'translateY(0)' },
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
    transition: `opacity ${duration}ms ${easing}, transform ${duration}ms ${easing}`,
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
