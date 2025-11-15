import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, RefreshCw, Loader2, Sparkles } from 'lucide-react';
import type { ExploreLook, ShopItem } from '../types/explore';
import { ExploreService } from '../services/exploreService';
import { ShopService, type ShopImageSearchResult } from '../services/shopService';
import { useAuth } from '../contexts/AuthContext';

type RemixReady = {
  id: string;
  name: string;
  imageUrl?: string;
  referenceImage?: string;
  items?: ShopItem[];
  shopResults?: ShopImageSearchResult | null;
  error?: string;
  timestamp: number;
};

const ExplorePage: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id ?? 'guest';
  const navigate = useNavigate();
  const [gender, setGender] = useState<'male' | 'female'>(ExploreService.getLatestUserGender());
  const [likes, setLikes] = useState(ExploreService.getLikes());
  const [looks, setLooks] = useState<ExploreLook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [userPhoto, setUserPhoto] = useState<string | null>(() => ExploreService.getLatestUserPhoto(userId));
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [pendingLook, setPendingLook] = useState<ExploreLook | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'explore' | 'liked'>('explore');
  const [activeTryOnId, setActiveTryOnId] = useState<string | null>(null);
  const [remixQueue, setRemixQueue] = useState<RemixReady[]>([]);
  const [selectedRemix, setSelectedRemix] = useState<RemixReady | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'error' | 'success' } | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const shuffleLooks = (items: ExploreLook[]) => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);

    ExploreService.getLooks(gender)
      .then((dataset) => {
        if (!cancelled) {
          setLooks(shuffleLooks(dataset));
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error(error);
          setLoadError('Unable to load explore looks right now.');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [gender]);

  useEffect(() => {
    setUserPhoto(ExploreService.getLatestUserPhoto(userId));
  }, [userId]);

  const handleLike = (look: ExploreLook) => {
    setLikes(ExploreService.likeLook(look));
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current && typeof window !== 'undefined') {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const showToast = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setToast({ message, type });
    if (typeof window === 'undefined') {
      return;
    }
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => setToast(null), 4000);
  };

  const executeRemix = async (look: ExploreLook, photo?: string) => {
    if (!photo) {
      showToast('Upload your own photo first to remix outfits.', 'error');
      return;
    }
    setActiveTryOnId(look.id);
    showToast('Creating your remix...', 'info');

    try {
      const lookWithItems = await ExploreService.ensureLookItems(look);
      const remix = await ExploreService.remixLook(photo, lookWithItems);
      if (remix.storagePath) {
        ExploreService.saveRemix(userId, {
          lookId: lookWithItems.id,
          lookName: lookWithItems.title,
          gender: lookWithItems.gender,
          storagePath: remix.storagePath,
          imageUrl: remix.styledPhotoUrl,
        });
      }
      const items = lookWithItems.items ?? [];
      let shopResults: ShopImageSearchResult | null = null;
      let shopErr: string | undefined;
      if (lookWithItems.imageUrl) {
        try {
          const primaryQuery =
            lookWithItems.items?.[0]?.searchQuery ||
            `${lookWithItems.title} ${lookWithItems.vibe ?? ''}`.trim() ||
            undefined;
          shopResults = await ShopService.searchByImage(lookWithItems.imageUrl, primaryQuery);
        } catch (error) {
          shopErr = error instanceof Error ? error.message : 'Failed to load shopping results';
        }
      } else {
        shopErr = 'Missing reference image for shopping search.';
      }

      const ready: RemixReady = {
        id: lookWithItems.id,
        name: lookWithItems.title,
        imageUrl: remix.styledPhotoUrl,
        referenceImage: lookWithItems.imageUrl,
        items,
        shopResults,
        error: shopErr,
        timestamp: Date.now(),
      };
      setRemixQueue((prev) => [ready, ...prev].slice(0, 6));
      showToast('Remix ready! Tap the notification to view it.', 'success');
    } catch (error) {
      console.error(error);
      showToast(error instanceof Error ? error.message : 'Failed to remix look', 'error');
    } finally {
      setActiveTryOnId(null);
    }
  };

  const handleRemix = (look: ExploreLook) => {
    if (!userPhoto) {
      setPendingLook(look);
      setIsPhotoModalOpen(true);
      return;
    }
    executeRemix(look, userPhoto);
  };


  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please upload an image file.');
      return;
    }

    const toDataUrl = (f: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(f);
      });

    try {
      const dataUrl = await toDataUrl(file);
      setUploadPreview(dataUrl);
    } catch {
      setUploadError('Failed to read image. Try another file.');
    }
  };

  const handlePhotoSave = async () => {
    if (!uploadPreview) {
      setUploadError('Select a photo first.');
      return;
    }
    ExploreService.setLatestUserPhoto(userId, uploadPreview);
    setUserPhoto(uploadPreview);
    setIsPhotoModalOpen(false);
    const lookToRemix = pendingLook;
    setPendingLook(null);
    setUploadPreview(null);
    if (lookToRemix) {
      executeRemix(lookToRemix, uploadPreview);
    }
  };

  const formatRemixTime = (timestamp: number) => {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const clearRemixQueue = () => {
    setRemixQueue([]);
    setSelectedRemix(null);
  };

  const likedLookIds = Object.entries(likes)
    .filter(([, liked]) => liked)
    .map(([id]) => id);

  const likedLooks = looks.filter((look) => likedLookIds.includes(look.id));
  const displayLooks = viewMode === 'explore' ? looks : likedLooks;

  return (
    <div className="min-h-screen bg-black text-white flex">
      <aside className="hidden md:flex flex-col w-72 border-r border-white/10 p-8 gap-8 sticky top-0 h-screen bg-black">
        <div>
          <p className="text-sm uppercase tracking-[0.4em] text-white/50">Wardrobe AI</p>
          <h1 className="text-3xl font-bold mt-2">Explore</h1>
        </div>

        <nav className="flex flex-col gap-4 text-white/70">
          <button
            className={`text-left hover:text-white transition ${viewMode === 'explore' ? 'text-white' : ''}`}
            onClick={() => setViewMode('explore')}
          >
            Explore feed
          </button>
          <button
            className={`text-left hover:text-white transition ${viewMode === 'liked' ? 'text-white' : ''}`}
            onClick={() => setViewMode('liked')}
          >
            Looks you liked ({likedLookIds.length})
          </button>
          <button className="text-left hover:text-white transition" onClick={() => navigate('/remixes')}>
            Your remixes
          </button>
          <button className="text-left hover:text-white transition" onClick={() => navigate('/explore-admin')}>
            Manage explore looks
          </button>
        </nav>

        <div className="space-y-3">
          <p className="text-xs uppercase tracking-widest text-white/40">Filter by</p>
          <div className="flex gap-3">
            {(['female', 'male'] as const).map(option => (
              <button
                key={option}
                onClick={() => setGender(option)}
                className={`flex-1 px-3 py-2 rounded-full border text-sm ${
                  gender === option ? 'border-white text-white' : 'border-white/20 text-white/60 hover:text-white'
                }`}
              >
                {option === 'female' ? 'Women' : 'Men'}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-white/60">
            <p className="text-xs uppercase tracking-[0.4em] flex items-center gap-2 text-white/50">
              <Sparkles className="w-4 h-4 text-amber-300" />
              Remix updates
            </p>
            {remixQueue.length > 0 && (
              <button
                onClick={clearRemixQueue}
                className="text-xs text-white/60 hover:text-white transition"
              >
                Clear
              </button>
            )}
          </div>
          <div className="space-y-2">
            {remixQueue.length === 0 ? (
              <p className="text-sm text-white/40">Try on a look and your remix status will appear here.</p>
            ) : (
              remixQueue.map((entry) => (
                <button
                  key={`${entry.id}_${entry.timestamp}`}
                  onClick={() => setSelectedRemix(entry)}
                  className="w-full text-left rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition p-3 flex items-center gap-3"
                >
                  <div className="w-14 h-20 rounded-xl overflow-hidden bg-white/10">
                    {entry.imageUrl || entry.referenceImage ? (
                      <img
                        src={entry.imageUrl || entry.referenceImage}
                        alt={entry.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-white/50">
                        Preview
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{entry.name}</p>
                    <p className="text-xs text-white/60">Ready • {formatRemixTime(entry.timestamp)}</p>
                    {entry.error && (
                      <p className="text-xs text-amber-200 mt-1">{entry.error}</p>
                    )}
                  </div>
                  <div className="text-amber-300 text-xs font-semibold uppercase tracking-widest">
                    View
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="mt-auto space-y-4 text-sm text-white/60">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center gap-3">
            <img
              src={userPhoto || 'https://placehold.co/80x80?text=Upload'}
              alt="Profile"
              className="w-16 h-16 object-cover rounded-2xl border border-white/20"
            />
            <div className="flex-1">
              <p className="text-xs uppercase tracking-[0.3em] text-white/40">Your base photo</p>
              <p className="font-semibold text-white">{user ? user.name ?? 'Wardrobe user' : 'Guest user'}</p>
              <button
                onClick={() => setIsPhotoModalOpen(true)}
                className="mt-1 text-xs text-black bg-white px-3 py-1 rounded-full font-semibold"
              >
                Update photo
              </button>
            </div>
          </div>
          <p>Tip: Click "Try on" to apply the outfit to your latest photo.</p>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
        {!userPhoto && (
          <div className="mb-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 text-yellow-100 p-4 text-sm">
            Upload a photo in the personal styling flow to unlock remixing.
          </div>
        )}

        {remixQueue.length > 0 && (
          <div className="md:hidden mb-6 rounded-3xl border border-white/10 bg-white/5 p-4 space-y-3">
            <div className="flex items-center gap-2 text-white/70 text-xs uppercase tracking-[0.3em]">
              <Sparkles className="w-4 h-4 text-amber-300" />
              Remix updates
            </div>
            <div className="space-y-2">
              {remixQueue.map((entry) => (
                <button
                  key={`${entry.id}_mobile_${entry.timestamp}`}
                  onClick={() => setSelectedRemix(entry)}
                  className="w-full rounded-2xl border border-white/10 bg-black/40 p-3 flex items-center gap-3 text-left"
                >
                  <div className="w-14 h-20 rounded-xl overflow-hidden bg-white/10">
                    {entry.imageUrl || entry.referenceImage ? (
                      <img
                        src={entry.imageUrl || entry.referenceImage}
                        alt={entry.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-white/50">
                        Preview
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{entry.name}</p>
                    <p className="text-xs text-white/60">Ready • {formatRemixTime(entry.timestamp)}</p>
                  </div>
                  <span className="text-xs text-amber-300 font-semibold uppercase">View</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-white/60">
            <Loader2 className="w-10 h-10 animate-spin" />
            <p>Loading looks...</p>
          </div>
        ) : loadError ? (
          <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
            {loadError}
          </div>
        ) : viewMode === 'liked' && likedLooks.length === 0 ? (
          <div className="text-white/60 text-center py-20">
            <p className="text-xl font-semibold">No liked looks yet</p>
            <p className="text-white/50 mt-2">Tap the heart icon on any explore card to save it here.</p>
          </div>
        ) : (
          <div className="flex flex-col xl:flex-row gap-6">
            <div className="flex-1">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {displayLooks.map((look) => {
                  const isActive = activeTryOnId === look.id;
                  return (
                    <article
                      key={look.id}
                      className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-xl group h-full flex flex-col"
                    >
                      <div className="relative">
                        <img
                          src={look.imageUrl}
                          alt={look.title}
                          className="w-full object-cover"
                          style={{ aspectRatio: '9 / 16' }}
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition" />
                        <div className="absolute bottom-3 left-3 right-3 text-sm">
                          <p className="font-semibold">{look.title}</p>
                          <p className="text-white/70 text-xs">{look.description}</p>
                        </div>
                      </div>
                      <div className="p-3 flex items-center justify-between text-sm border-t border-white/10 mt-auto gap-2 flex-wrap">
                        <button
                          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${
                            likes[look.id] ? 'bg-green-500 text-white' : 'bg-white text-black'
                          }`}
                          onClick={() => handleLike(look)}
                        >
                          <Heart className="w-4 h-4" />
                          {likes[look.id] ? 'Saved' : 'Like'}
                        </button>
                        <button
                          onClick={() => handleRemix(look)}
                          disabled={isActive}
                          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border transition ${
                            isActive
                              ? 'border-amber-300 text-amber-200 bg-amber-400/10 animate-pulse cursor-wait'
                              : 'border-white/30 text-white/80 hover:text-white'
                          }`}
                        >
                          {isActive ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-4 h-4" />
                              Try on
                            </>
                          )}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

          </div>
        )}
      </main>
      {selectedRemix && (
        <div className="fixed top-0 right-0 bottom-0 left-0 md:left-72 z-40 bg-black/80 backdrop-blur-xl">
          <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">Remix ready</p>
                <h3 className="text-2xl font-semibold mt-1">{selectedRemix.name}</h3>
                <p className="text-sm text-white/60">Finished at {formatRemixTime(selectedRemix.timestamp)}</p>
              </div>
              <button
                onClick={() => setSelectedRemix(null)}
                className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/70 hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,0.55fr)_minmax(0,0.45fr)]">
                <div className="space-y-4">
                  <div className="rounded-3xl border border-white/10 bg-white/5 overflow-hidden">
                    {selectedRemix.imageUrl || selectedRemix.referenceImage ? (
                      <img
                        src={selectedRemix.imageUrl || selectedRemix.referenceImage}
                        alt={selectedRemix.name}
                        className="w-full h-full object-cover"
                        style={{ aspectRatio: '9 / 16' }}
                      />
                    ) : (
                      <div className="aspect-[9/16] flex items-center justify-center text-white/60 text-sm">
                        Remix preview unavailable
                      </div>
                    )}
                  </div>
                  {selectedRemix.items && selectedRemix.items.length > 0 && (
                    <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.3em] text-white/50 mb-3">Items detected</p>
                      <ul className="space-y-2 text-sm text-white/80">
                        {selectedRemix.items.map((item) => (
                          <li key={item.id}>
                            <span className="font-semibold">{item.label}</span>
                            <span className="text-white/50"> - {item.searchQuery}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  {selectedRemix.error && (
                    <div className="rounded-3xl border border-yellow-500/30 bg-yellow-500/10 text-yellow-100 text-sm p-4">
                      {selectedRemix.error}
                    </div>
                  )}
                  {selectedRemix.shopResults && selectedRemix.shopResults.shopping.length > 0 ? (
                    <div className="rounded-3xl border border-white/10 bg-black/40 p-4 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.3em] text-white/50">Google Shopping</p>
                          <p className="text-base font-semibold">
                            {selectedRemix.shopResults.searchParameters?.q ?? 'Similar pieces we found'}
                          </p>
                          <p className="text-xs text-white/50 mt-1">Image-based search via serper.dev</p>
                        </div>
                        {selectedRemix.shopResults.searchParameters?.q && (
                          <a
                            href={`https://www.google.com/search?tbm=shop&q=${encodeURIComponent(
                              selectedRemix.shopResults.searchParameters.q
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-amber-300 hover:text-amber-200"
                          >
                            Open search
                          </a>
                        )}
                      </div>
                      <div className="space-y-3">
                        {selectedRemix.shopResults.shopping.slice(0, 6).map((product, idx) => (
                          <a
                            key={`${product.productId ?? product.link}_${idx}`}
                            href={product.link}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-3 rounded-2xl border border-white/10 p-3 hover:bg-white/5 transition"
                          >
                            <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/5 flex-shrink-0">
                              {product.imageUrl ? (
                                <img
                                  src={product.imageUrl}
                                  alt={product.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[10px] text-white/50">
                                  No image
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium leading-tight line-clamp-2">{product.title}</p>
                              <p className="text-xs text-white/50">
                                {product.source ?? 'Google Shopping'}
                                {typeof product.rating === 'number' && (
                                  <span className="ml-2">
                                    {product.rating.toFixed(1)}★
                                    {product.ratingCount ? ` (${product.ratingCount})` : ''}
                                  </span>
                                )}
                              </p>
                            </div>
                            <span className="text-sm font-semibold text-white/80">
                              {product.price ?? 'View'}
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                      Shopping links are warming up. Use the look description above if you need to search manually.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className={`fixed bottom-5 left-1/2 -translate-x-1/2 px-4 py-3 rounded-2xl border backdrop-blur-md z-50 text-sm ${
            toast.type === 'success'
              ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-100'
              : toast.type === 'error'
                ? 'bg-red-500/20 border-red-400/40 text-red-100'
                : 'bg-white/10 border-white/20 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      {isPhotoModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 text-gray-900 space-y-4 flex flex-col">
            <h3 className="text-xl font-semibold">Upload your photo</h3>
            <p className="text-sm text-gray-600">
              We use this photo privately to render outfits on you. Files never leave this device except for the AI edit.
            </p>
            <label className="block border border-dashed border-gray-300 rounded-2xl p-4 text-center cursor-pointer hover:border-gray-400">
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              {uploadPreview ? (
                <img src={uploadPreview} alt="Preview" className="w-full rounded-2xl max-h-[55vh] object-contain" />
              ) : (
                <span className="text-gray-500">Click to select an image</span>
              )}
            </label>
            {uploadError && <p className="text-sm text-red-500">{uploadError}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsPhotoModalOpen(false);
                  setPendingLook(null);
                  setUploadPreview(null);
                  setUploadError(null);
                }}
                className="flex-1 rounded-2xl border border-gray-300 py-2"
              >
                Cancel
              </button>
              <button
                onClick={handlePhotoSave}
                className="flex-1 rounded-2xl bg-black text-white py-2"
              >
                Save & continue
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ExplorePage;
