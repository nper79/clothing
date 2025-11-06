import React, { useState } from 'react';
import Replicate from "replicate";

const resolveUrl = (input: string | Request | URL): string => {
  if (typeof input === 'string') {
    return input;
  }
  if (input instanceof URL) {
    return input.toString();
  }
  if (input && typeof (input as Request).url === 'string') {
    return (input as Request).url;
  }
  return '';
};

// Use the same proxy as the main system
const customFetch = async (input: string | Request | URL, options: RequestInit = {}) => {
  const urlStr = resolveUrl(input);

  // Use proxy for Replicate API calls
  if (urlStr.includes('api.replicate.com')) {
    const proxyUrl = '/api/replicate' + urlStr.replace('https://api.replicate.com', '');
    console.log('Using Vite proxy for:', urlStr, '->', proxyUrl);

    const sourceHeaders = options.headers ?? (input instanceof Request ? input.headers : undefined);
    const baseHeaders = new Headers(sourceHeaders || undefined);

    baseHeaders.delete('authorization');

    if (!baseHeaders.has('content-type') && !(options.body instanceof FormData)) {
      baseHeaders.set('Content-Type', 'application/json');
    }

    return fetch(proxyUrl, {
      ...options,
      headers: Object.fromEntries(baseHeaders.entries())
    });
  }

  return fetch(input as RequestInfo, options);
};

const extractImageUrl = (output: unknown): string => {
  if (!output) {
    return '';
  }
  if (Array.isArray(output)) {
    return extractImageUrl(output[0]);
  }
  if (typeof output === 'string') {
    return output;
  }
  if (typeof output === 'object') {
    const candidate = output as Record<string, unknown>;
    if (typeof candidate.url === 'string') {
      return candidate.url;
    }
    if (Array.isArray(candidate.output)) {
      return extractImageUrl(candidate.output[0]);
    }
    if (typeof candidate.path === 'string') {
      return candidate.path;
    }
  }
  return '';
};

const DirectAPITest: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [tokenStatus, setTokenStatus] = useState<string>('');
  const [nanoImageUrl, setNanoImageUrl] = useState<string | null>(null);

  const replicate = new Replicate({
    auth: import.meta.env.VITE_REPLICATE_API_TOKEN,
    fetch: customFetch, // Use Vite proxy
    useFileOutput: false
  });

  const checkToken = () => {
    const token = import.meta.env.VITE_REPLICATE_API_TOKEN;
    const status = `Token: ${!!token ? '? FOUND' : '? MISSING'} | Length: ${token?.length || 0} | Starts with r8_: ${token?.startsWith('r8_') || false}`;
    setTokenStatus(status);
    setResults(prev => [...prev, status]);
  };

  const testDirectAPI = async () => {
    setIsLoading(true);
    try {
      console.log('Testing direct Replicate API (no proxy)...');

      // Test simples: tentar listar modelos
      const models = await replicate.models.list();
      console.log('? Models list retrieved:', models.length, 'models');
      setResults(prev => [...prev, `? Direct API Success: Found ${models.length} models`]);

      // Mostrar alguns modelos dispon�veis
      const claudeModel = models.find(m => m.name.includes('claude'));
      const nanoModel = models.find(m => m.name.includes('nano-banana'));

      if (claudeModel) {
        setResults(prev => [...prev, `? Claude Model Found: ${claudeModel.name}`]);
      } else {
        setResults(prev => [...prev, `?? Claude Model Not Found in available models`]);
      }

      if (nanoModel) {
        setResults(prev => [...prev, `? Nano Banana Model Found: ${nanoModel.name}`]);
      } else {
        setResults(prev => [...prev, `?? Nano Banana Model Not Found in available models`]);
      }

    } catch (error) {
      console.error('Direct API Error:', error);
      setResults(prev => [...prev, `? Direct API Error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      setIsLoading(false);
    }
  };

  const testClaudeDirect = async () => {
    setIsLoading(true);
    try {
      console.log('Testing Claude 4.5 directly...');
      const minTokens = 1024; // Replicate enforces >= 1024 tokens for Claude 4.5
      const output = await replicate.run("anthropic/claude-4.5-sonnet", {
        input: {
          prompt: "Create a simple fashion photography prompt for a man in business attire.",
          max_tokens: minTokens,
          temperature: 0.5
        }
      });

      console.log('Claude output:', output);
      setResults(prev => [...prev, `? Claude 4.5 Direct Success: ${JSON.stringify(output).substring(0, 100)}...`]);

    } catch (error) {
      console.error('Claude Direct Error:', error);
      setResults(prev => [...prev, `? Claude 4.5 Direct Error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      setIsLoading(false);
    }
  };

  const testNanoBananaDirect = async () => {
    setIsLoading(true);
    try {
      console.log('Testing Nano Banana directly...');
      const output = await replicate.run("google/nano-banana", {
        input: {
          prompt: "A professional man in a minimalist business suit, clean style, neutral colors",
          aspect_ratio: "2:3",
          output_format: "jpg"
        }
      });

      console.log('Nano Banana output:', output);

      const imageUrl = extractImageUrl(output);
      const summary = imageUrl ? imageUrl.substring(0, 50) + '...' : 'No URL';

      setNanoImageUrl(imageUrl || null);
      setResults(prev => [...prev, `Nano Banana Direct Success: ${summary}`]);

    } catch (error) {
      console.error('Nano Banana Direct Error:', error);
      setNanoImageUrl(null);
      setResults(prev => [...prev, `? Nano Banana Direct Error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">?? Direct API Test (No Proxy)</h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Direct API Controls</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <button
              onClick={checkToken}
              disabled={isLoading}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              ?? Check Token
            </button>
            <button
              onClick={testDirectAPI}
              disabled={isLoading}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
            >
              ?? Test Direct Connection
            </button>
            <button
              onClick={testClaudeDirect}
              disabled={isLoading}
              className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50"
            >
              ?? Test Claude Direct
            </button>
            <button
              onClick={testNanoBananaDirect}
              disabled={isLoading}
              className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 disabled:opacity-50"
            >
              ?? Test Nano Banana Direct
            </button>
          </div>

          {tokenStatus && (
            <div className="bg-blue-50 rounded p-4 mb-4">
              <h3 className="font-semibold mb-2">Token Status:</h3>
              <p className="text-sm">{tokenStatus}</p>
            </div>
          )}

          {isLoading && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2">Testing direct API...</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Results Log</h2>
          <div className="bg-gray-50 rounded p-4 h-64 overflow-y-auto">
            {results.length === 0 ? (
              <p className="text-gray-500">No tests run yet...</p>
            ) : (
              results.map((result, index) => (
                <div key={index} className="mb-2 text-sm font-mono">
                  {result}
                </div>
              ))
            )}
          </div>
        </div>

        {nanoImageUrl && (
          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <h2 className="text-xl font-semibold mb-4">Nano Banana Output Preview</h2>
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <img
                src={nanoImageUrl}
                alt="Latest Nano Banana output"
                className="max-w-xs rounded-lg shadow"
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src = 'https://via.placeholder.com/400x600?text=Preview+Unavailable';
                }}
              />
              <div className="text-sm">
                <p className="mb-2 break-all">
                  <span className="font-semibold">Image URL:</span>{' '}
                  <a
                    href={nanoImageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {nanoImageUrl}
                  </a>
                </p>
                <p className="text-gray-500">
                  The preview shows the most recent successful Nano Banana response. Open the link in a new tab if the image fails to load.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold mb-2">?? About This Test:</h3>
          <ul className="text-sm space-y-1">
            <li>� This tests the Replicate API directly without proxy</li>
            <li>� If this works, the issue is with the proxy configuration</li>
            <li>� If this fails, the issue is with token or network</li>
            <li>� Check the browser console for detailed error logs</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DirectAPITest;




