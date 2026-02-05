'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * PageTransition Component
 * Provides smooth page transitions with various animation types
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Page content to animate
 * @param {string} props.type - Animation type: 'fade' | 'slide-up' | 'slide-left' | 'slide-right' | 'blur' | 'scale' | 'none'
 * @param {number} props.duration - Animation duration in ms (default: 400)
 * @param {string} props.easing - CSS easing function (default: 'ease-out')
 * @param {boolean} props.exitAnimation - Whether to animate on exit (default: false for performance)
 */
export default function PageTransition({ 
  children, 
  type = 'fade',
  duration = 400,
  easing = 'cubic-bezier(0.16, 1, 0.3, 1)', // expo easing
  exitAnimation = false,
  className = ''
}) {
  const pathname = usePathname();
  const [isAnimating, setIsAnimating] = useState(true);
  const [displayChildren, setDisplayChildren] = useState(children);
  const prevPathRef = useRef(pathname);
  const containerRef = useRef(null);

  // Animation styles based on type
  const getAnimationStyles = () => {
    const baseStyles = {
      transition: `opacity ${duration}ms ${easing}, transform ${duration}ms ${easing}, filter ${duration}ms ${easing}`,
    };

    // Initial (hidden) state
    const initialStyles = {
      'fade': { opacity: 0 },
      'slide-up': { opacity: 0, transform: 'translateY(20px)' },
      'slide-down': { opacity: 0, transform: 'translateY(-20px)' },
      'slide-left': { opacity: 0, transform: 'translateX(20px)' },
      'slide-right': { opacity: 0, transform: 'translateX(-20px)' },
      'blur': { opacity: 0, filter: 'blur(10px)', transform: 'translateY(10px)' },
      'scale': { opacity: 0, transform: 'scale(0.95)' },
      'scale-blur': { opacity: 0, filter: 'blur(8px)', transform: 'scale(0.96)' },
      'none': {},
    };

    // Final (visible) state
    const finalStyles = {
      'fade': { opacity: 1 },
      'slide-up': { opacity: 1, transform: 'translateY(0)' },
      'slide-down': { opacity: 1, transform: 'translateY(0)' },
      'slide-left': { opacity: 1, transform: 'translateX(0)' },
      'slide-right': { opacity: 1, transform: 'translateX(0)' },
      'blur': { opacity: 1, filter: 'blur(0)', transform: 'translateY(0)' },
      'scale': { opacity: 1, transform: 'scale(1)' },
      'scale-blur': { opacity: 1, filter: 'blur(0)', transform: 'scale(1)' },
      'none': {},
    };

    return {
      base: baseStyles,
      initial: initialStyles[type] || initialStyles.fade,
      final: finalStyles[type] || finalStyles.fade,
    };
  };

  const styles = getAnimationStyles();
  
  // Handle route changes
  useEffect(() => {
    if (pathname !== prevPathRef.current) {
      // Route changed - trigger animation
      if (exitAnimation) {
        // Exit animation first, then update content
        setIsAnimating(true);
        
        const exitTimer = setTimeout(() => {
          setDisplayChildren(children);
          prevPathRef.current = pathname;
          
          // Small delay to ensure DOM update
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setIsAnimating(false);
            });
          });
        }, duration);

        return () => clearTimeout(exitTimer);
      } else {
        // No exit animation - direct transition
        setIsAnimating(true);
        setDisplayChildren(children);
        prevPathRef.current = pathname;
        
        // Start entrance animation
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setIsAnimating(false);
          });
        });
      }
    } else {
      // Same route - just update content without animation
      setDisplayChildren(children);
    }
  }, [pathname, children, exitAnimation, duration]);

  // Initial mount animation
  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsAnimating(false);
      });
    });
    
    return () => cancelAnimationFrame(timer);
  }, []);

  const containerStyle = {
    ...styles.base,
    ...(isAnimating ? styles.initial : styles.final),
  };

  return (
    <div 
      ref={containerRef}
      className={`page-transition-container ${className}`}
      style={containerStyle}
    >
      {displayChildren}
    </div>
  );
}

/**
 * PageTransitionWrapper - A simpler wrapper with CSS classes
 * For use with existing CSS animations
 */
export function PageTransitionWrapper({ 
  children, 
  animationClass = 'animate-fade-in-up',
  className = '' 
}) {
  const pathname = usePathname();
  const [key, setKey] = useState(0);
  
  useEffect(() => {
    setKey(prev => prev + 1);
  }, [pathname]);

  return (
    <div key={key} className={`${animationClass} ${className}`}>
      {children}
    </div>
  );
}

/**
 * AnimatedSection - For animating individual sections within a page
 * Useful for staggered animations
 */
export function AnimatedSection({ 
  children, 
  delay = 0,
  type = 'fade-up',
  className = '' 
}) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);
    
    return () => clearTimeout(timer);
  }, [delay]);

  const animationClasses = {
    'fade': 'animate-fade-in',
    'fade-up': 'animate-fade-in-up',
    'fade-down': 'animate-fade-in-down',
    'slide-left': 'animate-slide-in-left',
    'slide-right': 'animate-slide-in-right',
    'blur': 'animate-blur-in',
    'scale': 'animate-scale-blur-in',
    'pop': 'animate-pop-in',
  };

  return (
    <div 
      ref={ref}
      className={`${className} ${isVisible ? animationClasses[type] || animationClasses['fade-up'] : 'opacity-0'}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/**
 * StaggeredList - For animating lists with staggered delays
 */
export function StaggeredList({ 
  children, 
  baseDelay = 0,
  staggerDelay = 100,
  type = 'fade-up',
  className = '' 
}) {
  const animationClasses = {
    'fade': 'animate-fade-in',
    'fade-up': 'animate-fade-in-up',
    'blur': 'animate-blur-in',
    'scale': 'animate-scale-blur-in',
    'slide-left': 'animate-slide-in-left',
    'slide-right': 'animate-slide-in-right',
  };

  const animClass = animationClasses[type] || animationClasses['fade-up'];

  return (
    <div className={className}>
      {Array.isArray(children) 
        ? children.map((child, index) => (
            <div 
              key={index}
              className={animClass}
              style={{ 
                animationDelay: `${baseDelay + (index * staggerDelay)}ms`,
                animationFillMode: 'both'
              }}
            >
              {child}
            </div>
          ))
        : children
      }
    </div>
  );
}
