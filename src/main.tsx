import React, { Component, ErrorInfo, ReactNode } from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// Error Boundary to catch any JavaScript errors
interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('❌ Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '20px',
          fontFamily: 'Inter, system-ui, sans-serif',
          background: '#fff'
        }}>
          <div style={{ textAlign: 'center', maxWidth: '400px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#111', marginBottom: '8px' }}>
              Ha ocurrido un error
            </h1>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
              Por favor, recarga la página o vuelve a acceder desde el enlace original.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '12px 24px',
                background: '#2cbeff',
                color: '#fff',
                border: 'none',
                borderRadius: '999px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Recargar página
            </button>
            {this.state.error && (
              <details style={{ marginTop: '16px', textAlign: 'left', fontSize: '12px', color: '#999' }}>
                <summary>Detalles del error</summary>
                <pre style={{ overflow: 'auto', padding: '8px', background: '#f5f5f5', borderRadius: '4px', marginTop: '8px' }}>
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <App />
      </HashRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)

