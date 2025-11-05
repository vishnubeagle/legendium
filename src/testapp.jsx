import React, { useState, useEffect, useRef, useCallback } from 'react';
import { WebsiteSections } from './components/WebsiteSections';
import { AuthProvider } from './components/AuthContext';
import AuthPage from './components/AuthPage';
import ProfilePage from './components/ProfilePage';
import CenterNav from './components/CenterNav';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, useGLTF } from '@react-three/drei';
import './styles/WebsiteStyles.css';

useGLTF.preload('/chair.glb');

const ChairModel = ({ scrollProgress }) => {
  const { scene } = useGLTF('/chair.glb');
  const ref = useRef();

  useFrame((state) => {
    if (ref.current) {
      // Move down based on scroll progress, starting from top (y=5 initially, moving to -10)
      ref.current.position.y = 5 - scrollProgress * 15;
      // Rotate with a smooth feel as it scrolls
      ref.current.rotation.y = scrollProgress * Math.PI * 2; // Full rotation over scroll
      ref.current.rotation.x = Math.sin(scrollProgress * Math.PI) * 0.5; // Subtle tilt
    }
  });

  return <primitive ref={ref} object={scene} scale={1.5} position={[0, 0, -3]} />;
};

function App() {
  const [currentSection, setCurrentSection] = useState(0);
  const [showAuthPage, setShowAuthPage] = useState(false);
  const [route, setRoute] = useState(window.location.hash || '');
  const [scrollProgress, setScrollProgress] = useState(0);

  // Throttled scroll handler for smoother performance
  const handleScroll = useCallback(
    (throttleLimit = 16) => {
      let ticking = false;
      return () => {
        if (!ticking) {
          requestAnimationFrame(() => {
            const scrollPosition = window.scrollY;
            const sectionHeight = window.innerHeight * 1.2;
            const newSection = Math.floor(scrollPosition / sectionHeight);
            setCurrentSection(newSection);

            // Calculate scroll progress from 0 to 1
            const progress = Math.min(1, scrollPosition / (document.documentElement.scrollHeight - window.innerHeight));
            setScrollProgress(progress);

            ticking = false;
          });
          ticking = true;
        }
      };
    },
    []
  );

  const throttledScroll = handleScroll();

  useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash || '');

    window.addEventListener('scroll', throttledScroll);
    window.addEventListener('hashchange', onHashChange);
    throttledScroll(); // Initial call
    return () => {
      window.removeEventListener('scroll', throttledScroll);
      window.removeEventListener('hashchange', onHashChange);
    };
  }, [throttledScroll]);

  const scrollToSection = (index) => {
    window.scrollTo({
      top: index * (window.innerHeight * 1.2),
      behavior: 'smooth',
    });
  };

  // Updated to use 0-based indexing consistent with navigation dots and WebsiteSections
  const handleCenterNavClick = (index) => {
    scrollToSection(index); // index is 0-based (0 for hero/first section, up to 5 or 6 as needed)
  };

  return (
    <AuthProvider>
      <div className="app">
        {/* 3D Chair Model as scrolling background - optimized for performance */}
        <Canvas
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: -1,
            pointerEvents: 'none', // Allow clicks through to content
          }}
          camera={{ position: [0, 0, 5], fov: 60 }} // Lower FOV for perf
          gl={{ 
            antialias: false, // Disable for smoother perf
            powerPreference: 'low-power', // Prioritize battery/smoothness
            alpha: true // Transparent bg
          }}
          dpr={[1, 1.5]} // Adaptive DPI
        >
          <ambientLight intensity={0.4} />
          <pointLight position={[10, 10, 10]} intensity={0.8} />
          <ChairModel scrollProgress={scrollProgress} />
          <Environment preset="city" background={false} />
        </Canvas>
        
        <div className="overlay"></div>
        
        {route !== '#/profile' && (
          <>
            <div className="navigation-dots">
              {[0, 1, 2, 3, 4, 5, 6].map((index) => (
                <div
                  key={index}
                  className={`nav-dot ${currentSection === index ? 'active' : ''}`}
                  onClick={() => scrollToSection(index)}
                >
                  <div className="nav-dot-inner"></div>
                </div>
              ))}
            </div>

            {!showAuthPage && (
              <CenterNav
                activeIndex={currentSection}
                onClick={handleCenterNavClick}
              />
            )}
          </>
        )}

        {route === '#/profile' ? (
          <ProfilePage />
        ) : (
          <>
            <WebsiteSections
              scrollToSection={scrollToSection}
              onLoginOpen={() => setShowAuthPage(true)}
              onRegisterOpen={() => setShowAuthPage(true)}
            />
            {showAuthPage && <AuthPage onClose={() => setShowAuthPage(false)} />}
          </>
        )}
      </div>
    </AuthProvider>
  );
}

export default App;