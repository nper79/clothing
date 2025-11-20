import React, { useState, ChangeEvent, FormEvent } from 'react';

interface FalGridTestPageProps {
  onBack?: () => void;
}

const DEFAULT_PROMPT =
  'Create a 2x4 fashion grid showcasing tops, bottoms, shoes, and accessories inspired by an elevated streetwear look.';

const FalGridTestPage: React.FC<FalGridTestPageProps> = ({ onBack }) => {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [imageUrl, setImageUrl] = useState('');
  const [status, setStatus] = useState('');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) {
      return;
    }
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setStatus('');
    setResultUrl(null);
    try {
      const response = await fetch('/api/dev/fal-grid-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, imageUrl }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.error ?? 'Failed to call fal-grid-test');
      }
      const data = await response.json();
      if (data.imageUrl) {
        setResultUrl(data.imageUrl);
        setStatus('Generated successfully.');
      } else {
        setStatus('Request finished but no image URL was returned.');
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">fal.ai Grid Test</h1>
            <p className="text-gray-500 text-sm">
              Send custom prompts + reference images through the new fal endpoint.
            </p>
          </div>
          {onBack ? (
            <button
              onClick={onBack}
              className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              Back
            </button>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prompt</label>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={4}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Reference image (optional)</label>
            <input
              type="text"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="Remote URL or base64 data URL"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 text-sm"
            />
            <div>
              <label className="inline-flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                <span className="px-3 py-1 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">
                  Upload file
                </span>
                <span>or paste a URL above</span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 text-white rounded-xl py-3 font-semibold hover:bg-indigo-500 disabled:opacity-60"
          >
            {isLoading ? 'Generating...' : 'Generate with fal.ai'}
          </button>
        </form>

        {status && (
          <div className="p-3 rounded-xl border text-sm" style={{ borderColor: '#e5e7eb', color: '#374151' }}>
            {status}
          </div>
        )}

        {resultUrl && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Result</p>
            <img src={resultUrl} alt="fal result" className="rounded-xl border border-gray-100" />
            <a
              href={resultUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center text-sm text-indigo-600 hover:underline"
            >
              Open original
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default FalGridTestPage;
