import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: '#f8fafc',
          padding: 24,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: 16 }}>⚠️</div>
          <h1 style={{ fontSize: '1.8rem', color: '#1a202c', marginBottom: 8 }}>
            Une erreur inattendue s'est produite
          </h1>
          <p style={{ color: '#4a5568', marginBottom: 24, maxWidth: 480 }}>
            L'application a rencontré un problème. Veuillez réessayer ou revenir à l'accueil.
          </p>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre style={{
              background: '#fee2e2',
              color: '#991b1b',
              padding: 16,
              borderRadius: 8,
              fontSize: '0.8rem',
              maxWidth: 600,
              overflow: 'auto',
              marginBottom: 24,
              textAlign: 'left'
            }}>
              {this.state.error.toString()}
            </pre>
          )}
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => window.location.reload()} style={{
              padding: '12px 24px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600
            }}>🔄 Réessayer</button>
            <button onClick={this.handleReset} style={{
              padding: '12px 24px',
              background: '#fff',
              color: '#1a202c',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600
            }}>🏠 Accueil</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
