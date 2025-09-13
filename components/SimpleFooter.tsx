import React from 'react';
import Icon from './Icon';

interface SimpleFooterProps {
  navigate?: (route: 'home' | 'privacy' | 'terms') => void;
}

const SimpleFooter: React.FC<SimpleFooterProps> = ({ navigate }) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 mt-auto transition-colors duration-300">
      {/* Main Footer */}
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          {/* Brand Section */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg p-2">
              <img 
                src="/assets/wedai_logo_notext_nobg.png" 
                alt="WedAI Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white transition-colors duration-300">WedAI</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 transition-colors duration-300">by HuyBuilds</p>
            </div>
          </div>
          
          <p className="text-gray-600 dark:text-gray-400 text-sm max-w-md mx-auto mb-6 transition-colors duration-300">
            Transform your couple photos into magical AI-generated wedding portraits. 
            Completely free, privacy-first, and optimized for all devices.
          </p>

          {/* Features */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500 dark:text-gray-500 mb-6">
            <div className="flex items-center gap-2">
              <Icon path="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" className="w-4 h-4 text-red-500" />
              <span>Made with Love</span>
            </div>
            <div className="flex items-center gap-2">
              <Icon path="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" className="w-4 h-4 text-green-500 dark:text-green-400" />
              <span>Free Forever</span>
            </div>
            <div className="flex items-center gap-2">
              <Icon path="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" className="w-4 h-4 text-teal-500 dark:text-teal-400" />
              <span>Your Privacy Matters</span>
            </div>
          </div>

          {/* Tech Credit - Subtle */}
          <div className="text-center text-gray-500 dark:text-gray-600 text-xs mb-4 transition-colors duration-300">
            <p>Powered by Google Gemini AI</p>
          </div>

          {/* Social Links */}
          <div className="flex justify-center gap-4 mb-6">
            <a
              href="https://www.linkedin.com/in/huy-duong-b3116414/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors group"
              aria-label="LinkedIn"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
            <a
              href="https://twitter.com/huybuilds"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors group"
              aria-label="Twitter"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
              </svg>
            </a>
            <a
              href="mailto:huybuilds@gmail.com?subject=Hello from WedAI!"
              className="w-10 h-10 bg-gradient-to-r from-blue-600 to-teal-600 rounded-lg flex items-center justify-center hover:shadow-lg transition-all group"
              aria-label="Email"
            >
              <Icon path="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" className="w-5 h-5 text-white" />
            </a>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bg-gray-100/50 dark:bg-gray-800/50 border-t border-gray-300 dark:border-gray-700 transition-colors duration-300">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500 dark:text-gray-400">
            <div className="text-center md:text-left">
              <div>© {currentYear} HuyBuilds. All rights reserved. WedAI is free to use.</div>
              <div className="text-xs mt-1 text-gray-400 dark:text-gray-500">
                We use anonymous analytics to improve the app.
              </div>
            </div>
            <div className="flex items-center gap-6">
              <button 
                onClick={() => navigate?.('privacy')} 
                className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
              >
                Privacy
              </button>
              <span className="text-gray-400 dark:text-gray-600">•</span>
              <button 
                onClick={() => navigate?.('terms')} 
                className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
              >
                Terms
              </button>
              <span className="text-gray-400 dark:text-gray-600">•</span>
              <a href="mailto:huybuilds@gmail.com" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default SimpleFooter;