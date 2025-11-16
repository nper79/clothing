import React, { useEffect, useState } from 'react';
import { Loader2, Download } from 'lucide-react';
import type { ExploreLook } from '../types/explore';
import { ExploreService } from '../services/exploreService';

const STYLE_OPTIONS = [
  { id: '', label: 'Balanced mix' },
  { id: 'preppy', label: 'Preppy classics' },
  { id: 'work', label: 'Work / office' },
  { id: 'winter', label: 'Winter layers' },
  { id: 'street', label: 'Streetwear' },
] as const;

type ReferenceUpload = {
  id: string;
  name: string;
  dataUrl: string;
};

const MAX_REFERENCE_UPLOADS = 8;

const ExploreAdmin: React.FC = () => {
  const [gender, setGender] = useState<'male' | 'female'>(ExploreService.getLatestUserGender());
  const [count, setCount] = useState(10);
  const [styleTag, setStyleTag] = useState<string>('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dataset, setDataset] = useState<ExploreLook[]>([]);
  const [isDatasetLoading, setIsDatasetLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [referenceUploads, setReferenceUploads] = useState<ReferenceUpload[]>([]);
  const [isReferenceGenerating, setIsReferenceGenerating] = useState(false);
  const [gridRegeneratingId, setGridRegeneratingId] = useState<string | null>(null);
  const [isGridBatching, setIsGridBatching] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setIsDatasetLoading(true);
    setError(null);
    setStatus(null);

    ExploreService.getLooks(gender)
      .then((looks) => {
        if (!cancelled) {
          setDataset(looks);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error(err);
          setError(err instanceof Error ? err.message : 'Failed to load dataset');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsDatasetLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [gender]);

  const handleGenerate = async () => {
    setIsProcessing(true);
    setStatus(null);
    setError(null);

    try {
      const looks = await ExploreService.generateLooks(gender, count, styleTag || undefined);
      setDataset(looks);
      setStatus(`Dataset updated with ${Math.min(count, looks.length)} looks. Total stored: ${looks.length}.`);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClear = async () => {
    setError(null);
    setStatus(null);
    setIsProcessing(true);

    try {
      const looks = await ExploreService.clearLooks(gender);
      setDataset(looks);
      setStatus('Dataset cleared.');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to clear dataset');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = () => {
    if (dataset.length === 0) {
      setStatus('Nothing to export for this gender.');
      return;
    }

    const blob = new Blob([JSON.stringify(dataset, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `explore-${gender}-dataset.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (lookId: string) => {
    setError(null);
    setStatus(null);
    setDeletingId(lookId);

    try {
      const looks = await ExploreService.deleteLook(gender, lookId);
      setDataset(looks);
      setStatus('Look removed.');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to delete look');
    } finally {
      setDeletingId(null);
    }
  };

  const handleRegenerateGrid = async (lookId: string) => {
    setError(null);
    setStatus(null);
    setGridRegeneratingId(lookId);
    try {
      const updated = await ExploreService.regenerateGrid(gender, lookId);
      setDataset((prev) => prev.map((look) => (look.id === lookId ? updated : look)));
      setStatus('Grid rebuilt for selected look.');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to regenerate grid');
    } finally {
      setGridRegeneratingId(null);
    }
  };

  const handleRegenerateAllGrids = async () => {
    setError(null);
    setStatus(null);
    setIsGridBatching(true);
    try {
      const looks = await ExploreService.regenerateAllGrids(gender);
      setDataset(looks);
      setStatus('All grid overlays rebuilt for this gender.');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to regenerate grids');
    } finally {
      setIsGridBatching(false);
    }
  };

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleReferenceUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const files = event.target.files;
    if (!files?.length) return;
    const remainingSlots = MAX_REFERENCE_UPLOADS - referenceUploads.length;
    if (remainingSlots <= 0) return;

    const selected = Array.from(files).slice(0, remainingSlots);
    try {
      const entries = await Promise.all(
        selected.map(async (file) => ({
          id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name: file.name,
          dataUrl: await readFileAsDataUrl(file),
        }))
      );
      setReferenceUploads((prev) => [...prev, ...entries]);
    } catch (uploadError) {
      console.error(uploadError);
      setError('Failed to read one of the images. Please try again.');
    } finally {
      event.target.value = '';
    }
  };

  const removeReferenceUpload = (id: string) => {
    setReferenceUploads((prev) => prev.filter((item) => item.id !== id));
  };

  const handleReferenceGenerate = async () => {
    if (!referenceUploads.length) {
      setError('Add at least one reference image.');
      return;
    }
    setStatus(null);
    setError(null);
    setIsReferenceGenerating(true);
    try {
      const uploadCount = referenceUploads.length;
      const looks = await ExploreService.generateLooksFromReferences(
        gender,
        uploadCount,
        referenceUploads.map((item) => item.dataUrl),
        styleTag || undefined
      );
      setDataset(looks);
      setStatus(`Generated ${Math.min(uploadCount, looks.length)} reference-inspired looks.`);
      setReferenceUploads([]);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to generate looks from references');
    } finally {
      setIsReferenceGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-10">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-gray-500">Explore Admin</p>
            <h1 className="text-3xl font-bold text-gray-900">Pre-generate Explore Looks</h1>
            <p className="text-gray-600 text-sm">Use this tool to generate and cache looks that appear on the Explore feed.</p>
          </div>

          <div className="flex gap-3">
            {(['female', 'male'] as const).map(option => (
              <button
                key={option}
                onClick={() => setGender(option)}
                className={`px-4 py-2 rounded-full text-sm font-medium ${
                  gender === option ? 'bg-black text-white' : 'bg-white border border-gray-200 text-gray-600'
                }`}
              >
                {option === 'female' ? 'Women' : 'Men'} dataset
              </button>
            ))}
          </div>
        </header>

        <section className="bg-white rounded-2xl shadow p-6 space-y-6 mb-10">
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">How many looks?</label>
              <input
                type="number"
                min={1}
                max={50}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-xl px-3 py-2"
              />
              <p className="text-xs text-gray-500 mt-1">Maximum 50 per gender are stored at once.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current dataset size</label>
              <div className="text-2xl font-semibold text-gray-900">
                {isDatasetLoading ? '—' : dataset.length}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Style focus</label>
              <select
                value={styleTag}
                onChange={(event) => setStyleTag(event.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2"
              >
                {STYLE_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Optionally bias new looks toward a scene or vibe.</p>
            </div>
            <div className="flex items-end gap-3">
              <button
                onClick={handleGenerate}
                disabled={isProcessing}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-black text-white font-semibold disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <SparklesIcon />}
                Generate
              </button>
              <button
                onClick={handleClear}
                disabled={isProcessing}
                className="px-4 py-3 rounded-2xl border border-gray-200 text-gray-700 disabled:opacity-50"
              >
                Clear
              </button>
            </div>
          </div>

          {status && (
            <div className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-xl p-3">
              {status}
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
              {error}
            </div>
          )}
        </section>

        <section className="bg-white rounded-2xl shadow p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Inspiration upload</p>
              <h2 className="text-xl font-semibold text-gray-900">Generate from sample looks</h2>
              <p className="text-sm text-gray-500">Upload up to {MAX_REFERENCE_UPLOADS} looks you like and let GPT-5 extrapolate fresh options.</p>
            </div>
            <label className="inline-flex items-center justify-center px-4 py-2 rounded-xl border border-gray-200 text-gray-700 cursor-pointer hover:bg-gray-50">
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleReferenceUpload} />
              Upload images
            </label>
          </div>

          {referenceUploads.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {referenceUploads.map((upload) => (
                <div key={upload.id} className="relative border border-gray-100 rounded-xl overflow-hidden">
                  <img src={upload.dataUrl} alt={upload.name} className="w-full h-28 object-cover" />
                  <button
                    type="button"
                    onClick={() => removeReferenceUpload(upload.id)}
                    className="absolute top-2 right-2 bg-white/90 text-gray-700 rounded-full w-7 h-7 text-sm font-semibold shadow"
                    title="Remove"
                  >
                    ×
                  </button>
                  <div className="px-2 py-1 text-xs text-gray-600 truncate">{upload.name}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No reference images uploaded yet.</p>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleReferenceGenerate}
              disabled={referenceUploads.length === 0 || isReferenceGenerating}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-indigo-600 text-white font-semibold disabled:opacity-50"
            >
              {isReferenceGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Generate from references
            </button>
            <p className="text-xs text-gray-500 flex-1">
              We store these uploads privately in Supabase and only use them to guide the prompt batch.
            </p>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow p-6">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <h2 className="text-xl font-semibold text-gray-900">Dataset Preview</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRegenerateAllGrids}
                disabled={isGridBatching || isProcessing || isDatasetLoading}
                className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-xl border border-gray-200 text-gray-700 disabled:opacity-50"
              >
                {isGridBatching ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Rebuild grids
              </button>
              <button
                onClick={handleExport}
                className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-xl border border-gray-200 text-gray-700"
              >
                <Download className="w-4 h-4" />
                Export JSON
              </button>
            </div>
          </div>

          {isDatasetLoading ? (
            <div className="flex items-center gap-3 text-gray-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading dataset...
            </div>
          ) : dataset.length === 0 ? (
            <p className="text-sm text-gray-500">No looks stored for this gender yet. Generate some above.</p>
          ) : (
            <div className="grid md:grid-cols-3 gap-4">
              {dataset.map((look) => (
                <article key={look.id} className="relative border border-gray-100 rounded-2xl overflow-hidden flex flex-col">
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    <button
                      onClick={() => handleRegenerateGrid(look.id)}
                      disabled={gridRegeneratingId === look.id || isProcessing}
                      className="inline-flex items-center justify-center rounded-full bg-white/90 border border-gray-200 text-gray-700 w-8 h-8 text-xs font-semibold shadow-sm disabled:opacity-50"
                      title="Rebuild grid"
                    >
                      {gridRegeneratingId === look.id ? <Loader2 className="w-4 h-4 animate-spin" /> : '↺'}
                    </button>
                    <button
                      onClick={() => handleDelete(look.id)}
                      disabled={isProcessing || deletingId === look.id}
                      className="inline-flex items-center justify-center rounded-full bg-white/90 border border-gray-200 text-gray-700 w-8 h-8 text-sm font-semibold shadow-sm disabled:opacity-50"
                      title="Delete look"
                    >
                      {deletingId === look.id ? <Loader2 className="w-4 h-4 animate-spin" /> : '×'}
                    </button>
                  </div>
                  <img
                    src={look.imageUrl}
                    alt={look.title}
                    className="w-full object-cover"
                    style={{ aspectRatio: '9 / 16' }}
                  />
                  {look.gridImageUrl ? (
                    <img
                      src={look.gridImageUrl}
                      alt={`${look.title} grid`}
                      className="w-full object-cover border-t border-gray-100"
                      style={{ aspectRatio: '2 / 3' }}
                    />
                  ) : (
                    <div className="p-3 text-xs text-gray-500 border-t border-gray-100 text-center">
                      Grid not generated yet
                    </div>
                  )}
                  <div className="p-4 space-y-2 text-sm flex-1 flex flex-col">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-gray-400">{look.vibe}</p>
                      <h3 className="font-semibold text-gray-900">{look.title}</h3>
                      {look.styleTag && (
                        <p className="text-xs text-indigo-500 font-medium">{STYLE_OPTIONS.find(opt => opt.id === look.styleTag)?.label || look.styleTag}</p>
                      )}
                      <p className="text-gray-500">{look.description}</p>
                    </div>
                    <details className="mt-2 rounded-xl border border-gray-200 bg-gray-50 text-xs text-gray-600">
                      <summary className="cursor-pointer select-none px-3 py-2 font-medium text-gray-700">
                        View prompt
                      </summary>
                      <div className="px-3 pb-3 pt-1 whitespace-pre-line leading-relaxed">
                        {look.prompt}
                      </div>
                    </details>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

const SparklesIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 3v3m0 12v3m9-9h-3M6 12H3m15.364 6.364-2.121-2.121M8.757 8.757 6.636 6.636m0 10.728 2.121-2.121m8.486-8.486-2.121 2.121" />
  </svg>
);

export default ExploreAdmin;
