import React, { useState, useEffect } from 'react';
import { useViewport } from '../hooks/useViewport';

interface SplashScreenProps {
  onComplete: () => void;
  minDuration?: number;
  maxDuration?: number;
  showProgress?: boolean;
}

const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  minDuration = 2000,
  maxDuration = 4000,
  showProgress = true
}) => {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [loadingStage, setLoadingStage] = useState<string>('Initializing...');
  const { isMobile } = useViewport();

  useEffect(() => {
    if (!isMobile) {
      // Skip splash screen on desktop
      onComplete();
      return;
    }

    const stages = [
      { label: 'Initializing...', delay: 300 },
      { label: 'Loading AI models...', delay: 800 },
      { label: 'Preparing interface...', delay: 600 },
      { label: 'Almost ready...', delay: 400 }
    ];

    let currentStage = 0;
    let accumulatedTime = 0;

    const updateStage = () => {
      if (currentStage < stages.length) {
        setLoadingStage(stages[currentStage].label);
        
        const stageTimer = setTimeout(() => {
          accumulatedTime += stages[currentStage].delay;
          setProgress((accumulatedTime / minDuration) * 100);
          
          currentStage++;
          if (currentStage < stages.length) {
            updateStage();
          }
        }, stages[currentStage].delay);

        return stageTimer;
      }
    };

    const stageTimer = updateStage();

    // Ensure minimum duration
    const completeTimer = setTimeout(() => {
      setProgress(100);
      setLoadingStage('Ready!');
      
      // Fade out animation
      setTimeout(() => {
        setIsVisible(false);
        setTimeout(onComplete, 300);
      }, 200);
    }, minDuration);

    return () => {
      if (stageTimer) clearTimeout(stageTimer);
      clearTimeout(completeTimer);
    };
  }, [isMobile, minDuration, onComplete]);

  if (!isMobile || !isVisible) {
    return null;
  }

  return (
    <div
      className={`
        fixed inset-0 z-[9999] flex flex-col items-center justify-center
        bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800
        text-white transition-all duration-300
        ${isVisible ? 'opacity-100' : 'opacity-0'}
      `}
      style={{
        background: `
          radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
          linear-gradient(135deg, #7C3AED 0%, #5B21B6 50%, #4C1D95 100%)
        `
      }}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-transparent" />
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="splash-pattern" patternUnits="userSpaceOnUse" width="40" height="40">
              <circle cx="20" cy="20" r="1" fill="white" opacity="0.1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#splash-pattern)" />
        </svg>
      </div>

      {/* App Logo/Icon */}
      <div className="relative mb-8 animate-pulse">
        <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center shadow-2xl p-4">
          <img 
            src="/assets/wedai_logo_notext_nobg.png" 
            alt="WedAI Logo" 
            className="w-full h-full object-contain"
          />
        </div>
        
        {/* Glow effect */}
        <div className="absolute inset-0 w-24 h-24 bg-white/30 rounded-3xl blur-xl animate-ping" />
      </div>

      {/* App Name */}
      <h1 className="text-4xl font-bold mb-2 text-center">
        WedAI
      </h1>
      
      <p className="text-white/80 text-lg mb-12 text-center px-8">
        AI Wedding Portrait Generator
      </p>

      {/* Progress Section */}
      {showProgress && (
        <div className="w-full max-w-xs px-8">
          {/* Loading Stage */}
          <div className="text-center mb-4">
            <p className="text-white/90 text-sm font-medium">
              {loadingStage}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="relative">
            <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            
            {/* Progress Glow */}
            <div
              className="absolute top-0 h-1 bg-white/50 rounded-full blur-sm transition-all duration-300"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>

          {/* Progress Percentage */}
          <div className="text-center mt-3">
            <span className="text-white/70 text-xs font-medium">
              {Math.round(Math.min(progress, 100))}%
            </span>
          </div>
        </div>
      )}

      {/* Feature Highlights */}
      <div className="absolute bottom-8 left-0 right-0 px-8">
        <div className="flex justify-center space-x-6 text-white/60 text-xs">
          <div className="flex items-center space-x-1">
            <span>🎨</span>
            <span>10 Styles</span>
          </div>
          <div className="flex items-center space-x-1">
            <span>⚡</span>
            <span>AI Powered</span>
          </div>
          <div className="flex items-center space-x-1">
            <span>📱</span>
            <span>Mobile First</span>
          </div>
        </div>
      </div>

      {/* Loading Dots Animation */}
      <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2">
        <div className="flex space-x-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 bg-white/50 rounded-full animate-bounce"
              style={{
                animationDelay: `${i * 0.15}s`,
                animationDuration: '1s'
              }}
            />
          ))}
        </div>
      </div>

      {/* Version Info */}
      <div className="absolute top-8 right-8 text-white/40 text-xs">
        v2.1.0
      </div>

      {/* Safe Area Padding */}
      <style jsx>{`
        .splash-screen {
          padding-top: env(safe-area-inset-top);
          padding-bottom: env(safe-area-inset-bottom);
          padding-left: env(safe-area-inset-left);
          padding-right: env(safe-area-inset-right);
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;