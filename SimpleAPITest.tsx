import React, { useState } from 'react';

const SimpleAPITest: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');

  const testAPI = async () => {
    setLoading(true);
    setError('');
    setResult('');

    try {
      // Test direct API call with a simple prompt
      const response = await fetch('/api/replicate/v1/models/anthropic/claude-4.5-sonnet/predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: {
            prompt: 'Generate a single sentence about fashion.',
            max_tokens: 1024,
            temperature: 0.7
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('API Response:', data);
      setResult(JSON.stringify(data, null, 2));

    } catch (err) {
      console.error('API Error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Simple API Test</h2>
      <p>Testing direct communication with Replicate API</p>

      <button
        onClick={testAPI}
        disabled={loading}
        style={{
          padding: '10px 20px',
          backgroundColor: loading ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Testing...' : 'Test Claude API'}
      </button>

      {error && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '5px',
          color: '#721c24'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#d4edda',
          border: '1px solid #c3e6cb',
          borderRadius: '5px'
        }}>
          <strong>Success!</strong>
          <pre style={{
            marginTop: '10px',
            overflow: 'auto',
            maxHeight: '300px',
            fontSize: '12px'
          }}>
            {result}
          </pre>
        </div>
      )}
    </div>
  );
};

export default SimpleAPITest;