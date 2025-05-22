import React, { Component, ErrorInfo } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-indigo-950 to-purple-950 flex items-center justify-center p-4">
          <div className="bg-indigo-900/30 rounded-lg border border-purple-500/20 p-6 max-w-md w-full text-center">
            <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-purple-300 mb-2">Something went wrong</h2>
            <p className="text-purple-200 mb-4">
              An error occurred while processing your request. Please try again.
            </p>
            <button
              onClick={this.handleReload}
              className="btn btn-primary"
            >
              Reload Application
            </button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <pre className="mt-4 p-4 bg-indigo-950/50 rounded text-left text-sm text-purple-300 overflow-auto">
                {this.state.error.toString()}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;