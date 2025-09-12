import React from 'react';
import Icon from './Icon';

const AppShowcase: React.FC = () => {
  const apps = [
    {
      name: 'WedAI',
      url: 'https://wedai.huybuilds.app',
      description: 'AI-powered wedding portrait generator - this app!',
      icon: '💑',
      gradient: 'from-purple-500 to-pink-500',
      features: ['Wedding Portraits', '6 Unique Styles', 'Free Download'],
      tag: 'You are here'
    },
    {
      name: 'FaceSensei',
      url: 'https://facesensei.app',
      description: 'Advanced AI-powered face analysis and beauty scoring app',
      icon: '👤',
      gradient: 'from-blue-500 to-cyan-500',
      features: ['Face Analysis', 'Beauty Score', 'Age Detection'],
      tag: 'Popular'
    },
    {
      name: 'RollFlow',
      url: 'https://rollflow.app',
      description: 'Streamline your workflows with intelligent automation',
      icon: '🎯',
      gradient: 'from-green-500 to-emerald-500',
      features: ['Workflow Automation', 'Task Management', 'Team Collaboration'],
      tag: 'New'
    }
  ];

  return (
    <section className="py-16 bg-gray-900/50 border-y border-gray-800">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">
            Discover More AI Apps by{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
              HuyBuilds
            </span>
          </h3>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Join thousands of users who trust our AI-powered applications for their creative and productivity needs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {apps.map((app) => (
            <a
              key={app.name}
              href={app.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700 hover:border-gray-600 transition-all duration-300 hover:transform hover:scale-[1.02] hover:shadow-2xl"
            >
              {/* Tag */}
              {app.tag && (
                <span className={`absolute top-4 right-4 text-xs px-2 py-1 rounded-full font-medium ${
                  app.tag === 'Popular' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                  app.tag === 'New' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                  'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                }`}>
                  {app.tag}
                </span>
              )}

              {/* Icon */}
              <div className={`w-16 h-16 bg-gradient-to-br ${app.gradient} rounded-xl flex items-center justify-center text-3xl mb-4 group-hover:shadow-lg transition-shadow`}>
                {app.icon}
              </div>

              {/* Content */}
              <h4 className="text-xl font-bold text-white mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-pink-600 transition-all">
                {app.name}
              </h4>
              <p className="text-gray-400 text-sm mb-4">
                {app.description}
              </p>

              {/* Features */}
              <div className="flex flex-wrap gap-2 mb-4">
                {app.features.map((feature) => (
                  <span
                    key={feature}
                    className="text-xs bg-gray-700/50 text-gray-300 px-2 py-1 rounded-md"
                  >
                    {feature}
                  </span>
                ))}
              </div>

              {/* CTA */}
              <div className="flex items-center gap-2 text-sm font-medium text-purple-400 group-hover:text-purple-300">
                <span>Try it free</span>
                <Icon
                  path="M17 8l4 4m0 0l-4 4m4-4H3"
                  className="w-4 h-4 transform group-hover:translate-x-1 transition-transform"
                />
              </div>
            </a>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-12 grid grid-cols-3 gap-4 max-w-2xl mx-auto">
          <div className="text-center">
            <div className="text-3xl font-bold text-white">50K+</div>
            <div className="text-sm text-gray-400">Active Users</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white">4.8★</div>
            <div className="text-sm text-gray-400">Average Rating</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-white">100%</div>
            <div className="text-sm text-gray-400">Free to Use</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AppShowcase;