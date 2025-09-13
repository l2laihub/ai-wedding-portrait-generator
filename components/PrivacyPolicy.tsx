import React from 'react';
import { posthogService } from '../services/posthogService';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-300">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white/60 dark:bg-gray-800/40 rounded-3xl border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm shadow-xl p-8 transition-colors duration-300">
          
          <h1 className="text-4xl font-bold text-center mb-8 text-gray-900 dark:text-white">
            Privacy Policy
          </h1>
          
          <div className="text-sm text-gray-600 dark:text-gray-400 text-center mb-8">
            Last updated: {new Date().toLocaleDateString()}
          </div>

          <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
            
            <div className="bg-blue-50 dark:bg-blue-900/30 p-6 rounded-lg mb-8">
              <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
                🔒 Simple Privacy Promise
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                WedAI respects your privacy. We don't store your photos, don't collect personal information, 
                and only use anonymous analytics to improve the app. You're always in control.
              </p>
            </div>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
                What We Do With Your Data
              </h2>
              <div className="space-y-4 text-gray-700 dark:text-gray-300">
                
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                    <span>📸</span> Your Photos
                  </h3>
                  <ul className="space-y-1 text-sm">
                    <li>• Processed by Google's AI to create wedding portraits</li>
                    <li>• <strong>Never stored</strong> on our servers</li>
                    <li>• <strong>Never shared</strong> with anyone else</li>
                    <li>• Deleted immediately after processing</li>
                  </ul>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                    <span>📊</span> Analytics (Anonymous)
                  </h3>
                  <ul className="space-y-1 text-sm">
                    <li>• Anonymous usage statistics to improve the app</li>
                    <li>• No personal information collected</li>
                    <li>• Enabled by default, but you can opt out anytime</li>
                    <li>• Handled by PostHog analytics service</li>
                  </ul>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                    <span>⚙️</span> Technical Data
                  </h3>
                  <ul className="space-y-1 text-sm">
                    <li>• Browser type and device info (for compatibility)</li>
                    <li>• Anonymous performance metrics</li>
                    <li>• No tracking across other websites</li>
                  </ul>
                </div>

              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
                Your Rights & Control
              </h2>
              <div className="text-gray-700 dark:text-gray-300 space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="text-green-500 font-bold">✓</span>
                    <span>
                      <strong>Opt out of analytics</strong> anytime -{" "}
                      <button 
                        onClick={() => {
                          posthogService.optOut();
                          alert('✅ Analytics disabled! We will no longer collect usage data from your browser.');
                        }}
                        className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                      >
                        Click here to disable
                      </button>
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-green-500 font-bold">✓</span>
                    <span><strong>No account required</strong> - use the app completely anonymously</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-green-500 font-bold">✓</span>
                    <span><strong>Request information</strong> about what data we process (spoiler: very little!)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-green-500 font-bold">✓</span>
                    <span><strong>Contact us</strong> with any privacy questions or concerns</span>
                  </li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
                Third-Party Services
              </h2>
              <div className="text-gray-700 dark:text-gray-300">
                <p className="mb-3">We use these trusted services:</p>
                <ul className="space-y-2">
                  <li><strong>Google Gemini AI:</strong> Powers the AI portrait generation</li>
                  <li><strong>PostHog:</strong> Anonymous analytics (you can opt out)</li>
                </ul>
                <p className="text-sm mt-3 text-gray-600 dark:text-gray-400">
                  Each service has its own privacy policy. We chose them because they prioritize user privacy.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
                Questions?
              </h2>
              <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg text-gray-700 dark:text-gray-300">
                <p className="mb-3">
                  Have privacy questions? We're happy to help!
                </p>
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <span>📧</span>
                  <a href="mailto:huybuilds@gmail.com" className="hover:underline">
                    huybuilds@gmail.com
                  </a>
                </div>
              </div>
            </section>

            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <p className="text-center text-gray-600 dark:text-gray-400 text-sm">
                We believe privacy should be simple and transparent. 
                If something isn't clear, just ask! 😊
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;