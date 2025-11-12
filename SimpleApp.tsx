import React from 'react';

interface SimpleAppProps {
  onNavigateToApp?: () => void;
}

const SimpleApp: React.FC<SimpleAppProps> = ({ onNavigateToApp }) => {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f3f4f6',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <h1 style={{
          fontSize: '48px',
          fontWeight: 'bold',
          marginBottom: '20px',
          color: '#1f2937'
        }}>
          StyleAI ✅ Working!
        </h1>

        <p style={{
          fontSize: '18px',
          color: '#6b7280',
          marginBottom: '30px'
        }}>
          If you can see this page, the React app is loading correctly!
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginBottom: '30px'
        }}>
          <div style={{
            padding: '20px',
            backgroundColor: '#e0f2fe',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '10px' }}>🎨</div>
            <h3 style={{ fontWeight: 'bold', marginBottom: '5px' }}>AI Styling</h3>
            <p style={{ fontSize: '14px', color: '#6b7280' }}>Smart recommendations</p>
          </div>

          <div style={{
            padding: '20px',
            backgroundColor: '#fef3c7',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '10px' }}>☁️</div>
            <h3 style={{ fontWeight: 'bold', marginBottom: '5px' }}>Cloud Sync</h3>
            <p style={{ fontSize: '14px', color: '#6b7280' }}>Multi-device support</p>
          </div>

          <div style={{
            padding: '20px',
            backgroundColor: '#d1fae5',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '10px' }}>🧠</div>
            <h3 style={{ fontWeight: 'bold', marginBottom: '5px' }}>Smart Learning</h3>
            <p style={{ fontSize: '14px', color: '#6b7280' }}>Adapts to your style</p>
          </div>
        </div>

        <button
          onClick={() => alert('Button clicked!')}
          style={{
            padding: '12px 24px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          Test Button
        </button>

        <button
          onClick={onNavigateToApp || (() => window.location.href = '/app')}
          style={{
            padding: '12px 24px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          Try Style App
        </button>

        <div style={{
          marginTop: '30px',
          padding: '20px',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <h3 style={{ fontWeight: 'bold', marginBottom: '10px' }}>Next Steps:</h3>
          <ol style={{ paddingLeft: '20px', color: '#6b7280' }}>
            <li>Test this page loads correctly</li>
            <li>Click the buttons to verify functionality</li>
            <li>Navigate to the style app</li>
            <li>Test AI image generation</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default SimpleApp;