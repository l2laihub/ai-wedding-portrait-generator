import React, { useState } from 'react';
import Icon from './Icon';

const FloatingAppMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const apps = [
    {
      name: 'FaceSensei',
      url: 'https://facesensei.app',
      icon: '👤',
      gradient: 'from-blue-500 to-cyan-500',
      description: 'AI Face Analysis'
    },
    {
      name: 'RollFlow',
      url: 'https://rollflow.app',
      icon: '🎯',
      gradient: 'from-green-500 to-emerald-500',
      description: 'Workflow Automation'
    },
    {
      name: 'All Projects',
      url: 'https://huybuilds.com',
      icon: '🚀',
      gradient: 'from-purple-500 to-pink-500',
      description: 'HuyBuilds Portfolio'
    }
  ];

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* App Menu */}
      <div className={`absolute bottom-16 right-0 transition-all duration-300 ${
        isOpen ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-4 pointer-events-none'
      }`}>
        <div className="bg-gray-800/95 backdrop-blur-md rounded-2xl border border-gray-700 p-3 shadow-2xl min-w-[200px]">
          <div className="text-center mb-3">
            <h3 className="text-white font-semibold text-sm">More HuyBuilds Apps</h3>
            <p className="text-gray-400 text-xs">Explore our AI tools</p>
          </div>
          
          <div className="space-y-2">
            {apps.map((app) => (
              <a
                key={app.name}
                href={app.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-xl bg-gray-700/50 hover:bg-gray-700 transition-all group"
                onClick={() => setIsOpen(false)}
              >
                <div className={`w-8 h-8 bg-gradient-to-br ${app.gradient} rounded-lg flex items-center justify-center text-sm`}>
                  {app.icon}
                </div>
                <div className="flex-1">
                  <div className="text-white text-sm font-medium">{app.name}</div>
                  <div className="text-gray-400 text-xs">{app.description}</div>
                </div>
                <Icon
                  path="M17 8l4 4m0 0l-4 4m4-4H3"
                  className="w-4 h-4 text-gray-400 group-hover:text-purple-400 transition-colors"
                />
              </a>
            ))}
          </div>
          
          <div className="border-t border-gray-700 mt-3 pt-3">
            <a
              href="https://huybuilds.com"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2 rounded-lg text-sm font-medium hover:shadow-lg transition-all"
              onClick={() => setIsOpen(false)}
            >
              View All Projects
            </a>
          </div>
        </div>
      </div>

      {/* Main FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full shadow-lg flex items-center justify-center text-white hover:shadow-xl transition-all duration-300 ${
          isOpen ? 'transform rotate-45 scale-110' : 'hover:scale-105'
        }`}
        aria-label="Explore HuyBuilds Apps"
      >
        <Icon
          path={isOpen ? "M12 5v14m7-7H5" : "M4 6h16M4 10h16M4 14h16M4 18h16"}
          className="w-6 h-6"
        />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default FloatingAppMenu;