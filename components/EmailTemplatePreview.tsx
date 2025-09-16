import React, { useState } from 'react'
import { Mail, Eye, Code, Smartphone, Monitor } from 'lucide-react'

type EmailTemplate = 'reset-password' | 'welcome' | 'magic-link'
type ViewMode = 'desktop' | 'mobile'

export function EmailTemplatePreview() {
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate>('reset-password')
  const [viewMode, setViewMode] = useState<ViewMode>('desktop')
  const [showCode, setShowCode] = useState(false)

  const templates = {
    'reset-password': {
      name: 'Password Reset',
      description: 'Sent when user requests password reset',
      variables: {
        '.ConfirmationURL': 'https://yourapp.com/reset-password?token=abc123'
      }
    },
    'welcome': {
      name: 'Welcome Email',
      description: 'Sent after user signs up',
      variables: {
        '.Email': 'user@example.com',
        '.SiteURL': 'https://yourapp.com'
      }
    },
    'magic-link': {
      name: 'Magic Link',
      description: 'Passwordless sign-in email',
      variables: {
        '.ConfirmationURL': 'https://yourapp.com/auth/confirm?token=xyz789',
        '.ClientIP': '192.168.1.1'
      }
    }
  }

  const getTemplateUrl = () => `/email-templates/${selectedTemplate}.html`

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg">
          {/* Header */}
          <div className="border-b border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Mail className="w-8 h-8 text-purple-600" />
                <h1 className="text-2xl font-bold text-gray-900">Email Template Preview</h1>
              </div>
              <div className="flex items-center space-x-4">
                {/* View Mode Toggle */}
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('desktop')}
                    className={`flex items-center px-3 py-1.5 rounded ${
                      viewMode === 'desktop'
                        ? 'bg-white text-gray-900 shadow'
                        : 'text-gray-600'
                    }`}
                  >
                    <Monitor className="w-4 h-4 mr-1.5" />
                    Desktop
                  </button>
                  <button
                    onClick={() => setViewMode('mobile')}
                    className={`flex items-center px-3 py-1.5 rounded ${
                      viewMode === 'mobile'
                        ? 'bg-white text-gray-900 shadow'
                        : 'text-gray-600'
                    }`}
                  >
                    <Smartphone className="w-4 h-4 mr-1.5" />
                    Mobile
                  </button>
                </div>
                
                {/* Code Toggle */}
                <button
                  onClick={() => setShowCode(!showCode)}
                  className={`flex items-center px-4 py-2 rounded-lg border ${
                    showCode
                      ? 'border-purple-600 text-purple-600 bg-purple-50'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {showCode ? <Eye className="w-4 h-4 mr-2" /> : <Code className="w-4 h-4 mr-2" />}
                  {showCode ? 'Preview' : 'View Code'}
                </button>
              </div>
            </div>
          </div>

          <div className="flex h-[calc(100vh-200px)]">
            {/* Sidebar */}
            <div className="w-80 border-r border-gray-200 p-6 overflow-y-auto">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Templates</h2>
              <div className="space-y-3">
                {Object.entries(templates).map(([key, template]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedTemplate(key as EmailTemplate)}
                    className={`w-full text-left p-4 rounded-lg border transition-colors ${
                      selectedTemplate === key
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{template.name}</div>
                    <div className="text-sm text-gray-600 mt-1">{template.description}</div>
                  </button>
                ))}
              </div>

              <div className="mt-8">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Template Variables</h3>
                <div className="space-y-2">
                  {Object.entries(templates[selectedTemplate].variables).map(([key, value]) => (
                    <div key={key} className="text-sm">
                      <code className="text-purple-600 bg-purple-50 px-2 py-1 rounded">
                        {key}
                      </code>
                      <div className="text-gray-600 mt-1 ml-2">{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">Setup Instructions</h4>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Copy the HTML template</li>
                  <li>Go to Supabase Dashboard</li>
                  <li>Navigate to Auth → Email Templates</li>
                  <li>Paste and save</li>
                </ol>
              </div>
            </div>

            {/* Preview Area */}
            <div className="flex-1 bg-gray-100 p-8 overflow-auto">
              <div className={`mx-auto bg-white rounded-lg shadow-xl ${
                viewMode === 'mobile' ? 'max-w-sm' : 'max-w-3xl'
              }`}>
                {showCode ? (
                  <div className="p-6">
                    <pre className="text-sm overflow-x-auto">
                      <code className="language-html">
                        {`<!-- Copy this HTML to Supabase Email Templates -->
<!-- Template: ${templates[selectedTemplate].name} -->
<!-- View full template at: ${getTemplateUrl()} -->`}
                      </code>
                    </pre>
                    <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        <strong>Note:</strong> View the full HTML template file at{' '}
                        <code className="bg-yellow-100 px-2 py-1 rounded">
                          {getTemplateUrl()}
                        </code>
                      </p>
                    </div>
                  </div>
                ) : (
                  <iframe
                    src={getTemplateUrl()}
                    className="w-full h-full rounded-lg"
                    style={{ minHeight: '600px' }}
                    title={`${templates[selectedTemplate].name} Preview`}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}