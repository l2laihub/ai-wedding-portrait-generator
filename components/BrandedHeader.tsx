import React, { useState } from 'react';
import Icon from './Icon';

const BrandedHeader: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const otherApps = [
    {
      name: 'FaceSensei',
      url: 'https://facesensei.app',
      description: 'AI Face Analysis',
      icon: '👤',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      name: 'RollFlow',
      url: 'https://rollflow.app',
      description: 'Workflow Automation',
      icon: '🎯',
      color: 'from-green-500 to-emerald-500'
    }
  ];

  return (
    <header className="relative bg-gray-900/95 backdrop-blur-md border-b border-gray-800 sticky top-0 z-50">
      {/* Top bar with brand */}
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center font-bold text-white shadow-lg">
              🤵👰
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                WedAI
                <span className="text-xs bg-purple-600/20 text-purple-400 px-2 py-1 rounded-full border border-purple-500/30">
                  by HuyBuilds
                </span>
              </h1>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <a
              href="https://facesensei.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-sm"
            >
              <span>👤</span> FaceSensei
            </a>
            <a
              href="https://rollflow.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-sm"
            >
              <span>🎯</span> RollFlow
            </a>
            <a
              href="https://huybuilds.com"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-all transform hover:scale-105"
            >
              More Apps →
            </a>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
          >
            <Icon
              path={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
              className="w-6 h-6"
            />
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-gray-800/95 backdrop-blur-md border-t border-gray-700">
          <div className="container mx-auto px-4 py-4 space-y-3">
            {otherApps.map((app) => (
              <a
                key={app.name}
                href={app.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-colors"
              >
                <span className="text-2xl">{app.icon}</span>
                <div>
                  <div className="font-medium text-white">{app.name}</div>
                  <div className="text-xs text-gray-400">{app.description}</div>
                </div>
              </a>
            ))}
            <a
              href="https://huybuilds.com"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white text-center py-3 rounded-lg font-medium"
            >
              Explore All Apps →
            </a>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border-b border-gray-800">
        <div className="container mx-auto px-4 py-8 text-center">
          <h2 className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-3">
            WedAI
          </h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-2">
            Transform your couple photos into magical wedding portraits with AI
          </p>
          <p className="text-sm text-purple-300 mb-4">
            wedai.huybuilds.app
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <div className="flex items-center gap-2 text-gray-400">
              <Icon path="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" className="w-5 h-5 text-green-500" />
              <span>100% Free</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Icon path="M13 10V3L4 14h7v7l9-11h-7z" className="w-5 h-5 text-yellow-500" />
              <span>Instant Results</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Icon path="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" className="w-5 h-5 text-blue-500" />
              <span>Privacy First</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default BrandedHeader;