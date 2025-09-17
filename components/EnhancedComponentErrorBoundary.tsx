import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback: ReactNode;
  componentName?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error Boundary for Enhanced Components
 * 
 * Gracefully handles errors in enhanced components and falls back to legacy components
 */
class EnhancedComponentErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { componentName = 'Enhanced Component', onError } = this.props;
    
    // Log the error
    console.error(`[${componentName}] Error caught by boundary:`, error, errorInfo);
    
    // Track error in analytics if available
    if (typeof window !== 'undefined' && window.posthog) {
      window.posthog.capture('enhanced_component_error', {
        component: componentName,
        error: error.message,
        stack: error.stack,
        errorBoundary: true
      });
    }
    
    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      const { fallback, componentName = 'Enhanced Component' } = this.props;
      
      // In development, show detailed error info
      if (process.env.NODE_ENV === 'development') {
        return (
          <div className="border-2 border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-700 rounded-lg p-4 my-4">
            <div className="flex items-start gap-3">
              <div className="text-red-500">⚠️</div>
              <div className="flex-1">
                <h3 className="text-red-800 dark:text-red-200 font-semibold mb-2">
                  {componentName} Error (Development Mode)
                </h3>
                <p className="text-red-700 dark:text-red-300 text-sm mb-3">
                  An error occurred in the enhanced component. Falling back to legacy component.
                </p>
                {this.state.error && (
                  <details className="text-xs text-red-600 dark:text-red-400">
                    <summary className="cursor-pointer mb-2">Error Details</summary>
                    <pre className="whitespace-pre-wrap bg-red-100 dark:bg-red-900/40 p-2 rounded border overflow-auto max-h-32">
                      {this.state.error.message}
                      {'\n\n'}
                      {this.state.error.stack}
                    </pre>
                  </details>
                )}
                <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-800">
                  <p className="text-red-600 dark:text-red-400 text-xs mb-2">
                    Fallback Component:
                  </p>
                  {fallback}
                </div>
              </div>
            </div>
          </div>
        );
      }
      
      // In production, just show the fallback
      return fallback;
    }

    return this.props.children;
  }
}

export default EnhancedComponentErrorBoundary;