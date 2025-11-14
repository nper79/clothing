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

// Custom fetch implementation that uses our proxy
const customFetch = async (input: string | Request | URL, options: RequestInit = {}) => {
  const urlStr = resolveUrl(input);

  // Replace direct Replicate API calls with our proxy
  if (urlStr.includes('api.replicate.com')) {
    const proxyUrl = urlStr.replace('https://api.replicate.com', '/api/replicate');
    console.log('Using proxy for:', urlStr, '->', proxyUrl);

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

const TestReplicateAPI: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [gptResult, setGptResult] = useState<string>('');
  const [nanoBananaResult, setNanoBananaResult] = useState<string>('');

  const replicate = new Replicate({
    auth: import.meta.env.VITE_REPLICATE_API_TOKEN,
    fetch: customFetch,
    useFileOutput: false
  });

  const testGpt5 = async () => {
    setIsLoading(true);
    try {
      console.log('Testing GPT-5...');
      const minTokens = 1024; // GPT-5 on Replicate requires >= 1024 tokens
      const output = await replicate.run("openai/gpt-5", {
        input: {
          prompt: "Create a detailed fashion photography prompt for a man in minimalist business attire. Keep it concise and professional.",
          max_tokens: minTokens,
          temperature: 0.7
        }
      });

      console.log('GPT-5 output:', output);

      let result = '';
      if (Array.isArray(output)) {
        result = output[0] || '';
      } else if (typeof output === 'string') {
        result = output;
      } else if (typeof output === 'object' && output !== null) {
        result = (output as any)?.text || (output as any)?.output || JSON.stringify(output);
      }

      setGptResult(result);
      setResults(prev => [...prev, `? GPT-5: ${result.substring(0, 100)}...`]);
    } catch (error) {
      console.error('GPT-5 error:', error);
      setGptResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setResults(prev => [...prev, `? GPT-5 Error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      setIsLoading(false);
    }
  };

  const testNanoBanana = async () => {
    setIsLoading(true);
    try {
      console.log('Testing Nano Banana...');
      const testPrompt = "Full body fashion photo of a handsome man in minimalist business suit, clean professional style, neutral colors, modern office background, high quality photography";

      const output = await replicate.run("google/nano-banana", {
        input: {
          prompt: testPrompt,
          aspect_ratio: "2:3",
          output_format: "jpg"
        }
      });

      console.log('Nano Banana output:', output);

      const imageUrl = extractImageUrl(output);

      setNanoBananaResult(imageUrl);
      setResults(prev => [...prev, `Nano Banana: ${imageUrl ? 'Image generated successfully' : 'No image URL returned'}`]);

    } catch (error) {
      console.error('Nano Banana error:', error);
      setNanoBananaResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setResults(prev => [...prev, `? Nano Banana Error: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      setIsLoading(false);
    }
  };

  const testFullWorkflow = async () => {
    setIsLoading(true);
    try {
      setResults(prev => [...prev, '?? Starting full workflow test...']);

      // Step 1: Test GPT-5
      setResults(prev => [...prev, 'Step 1: Testing GPT-5...']);
      const minTokens = 1024;
      const gptOutput = await replicate.run("openai/gpt-5", {
        input: {
          prompt: "Create a detailed fashion photography prompt for a man in minimalist business attire. Keep it concise and professional.",
          max_tokens: minTokens,
          temperature: 0.7
        }
      });

      let gptPrompt = '';
      if (Array.isArray(gptOutput)) {
        gptPrompt = gptOutput[0] || '';
      } else if (typeof gptOutput === 'string') {
        gptPrompt = gptOutput;
      } else if (typeof gptOutput === 'object' && gptOutput !== null) {
        gptPrompt = (gptOutput as any)?.text || (gptOutput as any)?.output || '';
      }

      setResults(prev => [...prev, `? GPT-5 generated: ${gptPrompt.substring(0, 100)}...`]);

      // Step 2: Test Nano Banana with GPT-5's prompt
      setResults(prev => [...prev, 'Step 2: Testing Nano Banana with GPT-5 prompt...']);
      const nanoOutput = await replicate.run("google/nano-banana", {
        input: {
          prompt: gptPrompt,
          aspect_ratio: "2:3",
          output_format: "jpg"
        }
      });


      const imageUrl = extractImageUrl(nanoOutput);

      setResults(prev => [...prev, `Full workflow completed! Image: ${imageUrl}`]);
      setNanoBananaResult(imageUrl);



    } catch (error) {
      console.error('Full workflow error:', error);
      setResults(prev => [...prev, `? Full workflow failed: ${error instanceof Error ? error.message : 'Unknown error'}`]);
    } finally {
      setIsLoading(false);
    }
  };

  const checkToken = () => {
    const token = import.meta.env.VITE_REPLICATE_API_TOKEN;
    console.log('Token check:', {
      exists: !!token,
      length: token?.length || 0,
      startsWithR8: token?.startsWith('r8_') || false
    });
    setResults(prev => [...prev, `Token Status: ${!!token ? '? Found' : '? Missing'} (Length: ${token?.length || 0})`]);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">?? Replicate API Test Page</h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">API Controls</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <button
              onClick={checkToken}
              disabled={isLoading}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              ?? Check Token
            </button>
            <button
              onClick={testGpt5}
              disabled={isLoading}
              className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50"
            >
              ?? Test GPT-5
            </button>
            <button
              onClick={testNanoBanana}
              disabled={isLoading}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
            >
              ?? Test Nano Banana
            </button>
            <button
              onClick={testFullWorkflow}
              disabled={isLoading}
              className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 disabled:opacity-50"
            >
              ?? Test Full Workflow
            </button>
          </div>

          {isLoading && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2">Testing API...</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Results Log</h2>
          <div className="bg-gray-50 rounded p-4 h-64 overflow-y-auto">
            {results.length === 0 ? (
              <p className="text-gray-500">No tests run yet...</p>
            ) : (
              results.map((result, index) => (
                <div key={index} className="mb-2 text-sm">
                  {result}
                </div>
              ))
            )}
          </div>
        </div>

        {gptResult && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">?? GPT-5 Result</h2>
            <div className="bg-purple-50 rounded p-4">
              <p className="whitespace-pre-wrap">{gptResult}</p>
            </div>
          </div>
        )}

        {nanoBananaResult && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">?? Nano Banana Result</h2>
            {nanoBananaResult.startsWith('http') ? (
              <div>
                <img
                  src={nanoBananaResult}
                  alt="Generated by Nano Banana"
                  className="max-w-md rounded shadow-md mb-4"
                  onError={(e) => {
                    e.currentTarget.src = 'https://via.placeholder.com/400x600?text=Image+Failed+To+Load';
                  }}
                />
                <a
                  href={nanoBananaResult}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline text-sm"
                >
                  View Image in New Tab
                </a>
              </div>
            ) : (
              <div className="bg-green-50 rounded p-4">
                <p className="text-sm">{nanoBananaResult}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TestReplicateAPI;


