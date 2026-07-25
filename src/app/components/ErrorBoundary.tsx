import React from 'react'

type Props = { children: React.ReactNode }

type State = { hasError: boolean; message?: string }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error) {
    console.error('UI crash:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background text-foreground">
          <div className="max-w-md text-center space-y-4">
            <h1 className="text-2xl font-bold">Diçka shkoi keq</h1>
            <p className="text-sm text-muted-foreground">
              Faqja hasi një gabim. Rifresko ose kthehu në ballina.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
                onClick={() => window.location.reload()}
              >
                Rifresko
              </button>
              <a
                href="/"
                className="px-4 py-2 rounded-xl border border-white/15 text-sm font-medium"
              >
                Ballina
              </a>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
