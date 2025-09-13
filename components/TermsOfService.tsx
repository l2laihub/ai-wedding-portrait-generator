import React from 'react';

const TermsOfService: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-300">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white/60 dark:bg-gray-800/40 rounded-3xl border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm shadow-xl p-8 transition-colors duration-300">
          
          <h1 className="text-4xl font-bold text-center mb-8 text-gray-900 dark:text-white">
            Terms of Service
          </h1>
          
          <div className="text-sm text-gray-600 dark:text-gray-400 text-center mb-8">
            Last updated: {new Date().toLocaleDateString()}
          </div>

          <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
            
            <div className="bg-green-50 dark:bg-green-900/30 p-6 rounded-lg mb-8">
              <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">
                📝 Simple Terms
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                WedAI is free to use! These terms are straightforward: be respectful, 
                only upload photos you own, and understand that AI results may vary. 
                We're here to help you create beautiful wedding portraits safely.
              </p>
            </div>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
                What WedAI Does
              </h2>
              <div className="text-gray-700 dark:text-gray-300 space-y-4">
                <p>WedAI is a free web app that creates AI wedding portraits from your photos using:</p>
                <ul className="space-y-2">
                  <li>✨ <strong>Google's Gemini AI</strong> for smart image processing</li>
                  <li>🎨 <strong>Multiple artistic styles</strong> for your wedding portraits</li>
                  <li>📱 <strong>Mobile-friendly design</strong> that works everywhere</li>
                  <li>⚡ <strong>Instant downloads</strong> - no account needed</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
                What We Ask of You
              </h2>
              <div className="text-gray-700 dark:text-gray-300 space-y-4">
                
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h3 className="text-lg font-medium mb-2">✅ Please Do:</h3>
                  <ul className="space-y-1 text-sm">
                    <li>• Upload only photos you own or have permission to use</li>
                    <li>• Use the app for personal, non-commercial purposes</li>
                    <li>• Be respectful and follow the law</li>
                    <li>• Enjoy creating beautiful wedding portraits!</li>
                  </ul>
                </div>

                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                  <h3 className="text-lg font-medium mb-2">❌ Please Don't:</h3>
                  <ul className="space-y-1 text-sm">
                    <li>• Upload inappropriate, offensive, or illegal content</li>
                    <li>• Upload copyrighted images without permission</li>
                    <li>• Try to break or abuse the service</li>
                    <li>• Upload other people's photos without their consent</li>
                  </ul>
                </div>

              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
                Your Photos & Generated Results
              </h2>
              <div className="text-gray-700 dark:text-gray-300 space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="text-green-500 font-bold">✓</span>
                    <span><strong>You own your photos</strong> - we just process them temporarily</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-green-500 font-bold">✓</span>
                    <span><strong>You keep the generated portraits</strong> - they're yours to use and share</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-green-500 font-bold">✓</span>
                    <span><strong>We don't store your images</strong> - they're deleted after processing</span>
                  </li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
                Important Disclaimers
              </h2>
              <div className="bg-yellow-50 dark:bg-yellow-900/30 p-6 rounded-lg text-gray-700 dark:text-gray-300">
                <h3 className="text-lg font-medium mb-3">⚠️ Please Understand:</h3>
                <ul className="space-y-2 text-sm">
                  <li>• <strong>AI results vary</strong> - we can't guarantee perfect results every time</li>
                  <li>• <strong>For entertainment</strong> - generated portraits are for fun, not official use</li>
                  <li>• <strong>Service "as is"</strong> - we do our best but can't promise 100% uptime</li>
                  <li>• <strong>Free service</strong> - this means we have limited liability (basically $0)</li>
                  <li>• <strong>Age requirement</strong> - you must be 13+ to use this service</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
                Service Limitations
              </h2>
              <div className="text-gray-700 dark:text-gray-300">
                <ul className="space-y-2">
                  <li>• Sometimes the service might be down for maintenance</li>
                  <li>• There are file size limits for uploads</li>
                  <li>• We might add rate limits to prevent abuse</li>
                  <li>• Quality depends on your input photo and the AI's capabilities</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
                Changes & Contact
              </h2>
              <div className="text-gray-700 dark:text-gray-300 space-y-4">
                <p>
                  We might update these terms occasionally. If we do, we'll update the date at the top. 
                  Continuing to use the app means you're okay with any changes.
                </p>
                
                <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
                  <p className="mb-3">
                    Questions about these terms? We're here to help!
                  </p>
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <span>📧</span>
                    <a href="mailto:huybuilds@gmail.com" className="hover:underline">
                      huybuilds@gmail.com
                    </a>
                  </div>
                </div>
              </div>
            </section>

            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <p className="text-center text-gray-600 dark:text-gray-400 text-sm">
                Thanks for using WedAI! We hope you create amazing wedding portraits! 💕
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;