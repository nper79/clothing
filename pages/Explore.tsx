import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, RefreshCw, Loader2, Sparkles } from 'lucide-react';
import type { ExploreLook, ShopItem } from '../types/explore';
import { ExploreService } from '../services/exploreService';
import { ShopService, type ItemShoppingResult } from '../services/shopService';
import { useAuth } from '../contexts/AuthContext';

type RemixReady = {
  id: string;
  name: string;
  imageUrl?: string;
  referenceImage?: string;
  items?: ShopItem[];
  shopResults?: ItemShoppingResult[];
  error?: string;
  timestamp: number;
};

const ExplorePage: React.FC = () => {
  const { user, credits, refreshCredits } = useAuth();
  const userId = user?.id || null;
  const storageUserId = user?.id ?? 'guest';
  const navigate = useNavigate();
  const [gender, setGender] = useState<'male' | 'female'>(ExploreService.getLatestUserGender());
  const [likes, setLikes] = useState(ExploreService.getLikes());
  const [looks, setLooks] = useState<ExploreLook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [userPhoto, setUserPhoto] = useState<string | null>(() => ExploreService.getLatestUserPhoto(storageUserId));
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [pendingLook, setPendingLook] = useState<ExploreLook | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'explore' | 'liked'>('explore');
  const [activeTryOnId, setActiveTryOnId] = useState<string | null>(null);
  const [remixQueue, setRemixQueue] = useState<RemixReady[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'error' | 'success' } | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const handleSaveUploadedPhoto = () => {
    if (!uploadPreview) return;
    try {
      ExploreService.setLatestUserPhoto(storageUserId, uploadPreview);
      setUserPhoto(uploadPreview);
      showToast('Photo saved! You can now try on looks.', 'success');
      setIsPhotoModalOpen(false);
      setUploadPreview(null);
      setUploadError(null);
      if (pendingLook) {
        handleRemix(pendingLook);
        setPendingLook(null);
      }
    } catch (error) {
      console.error('Failed to save photo', error);
      setUploadError(
        error instanceof Error ? error.message : 'Failed to save this photo. Try a smaller image.'
      );
    }
  };

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

    const loadLooks = async () => {
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
            console.error('[ExplorePage] Error loading looks:', error);
            setLoadError(`Failed to load: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });

      return () => {
        cancelled = true;
      };
    };

    loadLooks();

    return () => {
      cancelled = true;
    };
  }, [gender]);

  useEffect(() => {
    setUserPhoto(ExploreService.getLatestUserPhoto(storageUserId));
  }, [storageUserId]);

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

  const openRemixDetailPage = (remix: RemixReady) => {
    navigate(`/remixes`, {
      state: {
        selectedRemix: remix,
      },
    });
  };

  const handleRemix = async (look: ExploreLook) => {
    if (!userPhoto) {
      setIsPhotoModalOpen(true);
      setPendingLook(look);
      return;
    }

    if (activeTryOnId === look.id) return;

    setActiveTryOnId(look.id);
    try {
      const userPhotoUrl = ExploreService.getLatestUserPhoto(storageUserId);
      const result = await ExploreService.remixLook(userId, userPhotoUrl, look);

      showToast(`Creating "${look.title}" remix...`, 'info');

      const remix: RemixReady = {
        id: `${look.id}_${Date.now()}`,
        name: look.title,
        lookId: look.id,
        lookName: look.title,
        gender: look.gender,
        imageUrl: undefined, // Will be set when the image is ready
        referenceImage: look.imageUrl,
        items: result.items,
        shopResults: result.shopResults,
        error: result.error,
        timestamp: Date.now(),
      };

      // Add to queue
      setRemixQueue((prev) => [remix, ...prev].slice(0, 10));

      // Wait for image generation
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Try to fetch the image
      try {
        const response = await fetch(`/api/remix-image?lookId=${look.id}&userId=${userId}`, {
          method: 'GET',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.url) {
            remix.imageUrl = data.url;
            setRemixQueue((prev) => {
              const updated = prev.map((r) => (r.id === remix.id ? { ...r, imageUrl: data.url } : r));
              openRemixDetailPage(remix);
              return updated;
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch remix image:', error);
      }

      if (!remix.imageUrl) {
        // If no image, open the detail page after a delay
        setTimeout(() => {
          openRemixDetailPage(remix);
          setRemixQueue((prev) => prev.filter((r) => r.id !== remix.id));
        }, 1000);
      }

      setActiveTryOnId(null);
      showToast('Remix created!', 'success');
    } catch (error: any) {
      console.error('Remix failed:', error);
      showToast(`Remix failed: ${error.message || 'Unknown error'}`, 'error');
      setActiveTryOnId(null);
    }
  };

  const formatRemixTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const filteredLooks = viewMode === 'liked' ? looks.filter((look) => likes[look.id]) : looks;
  const displayLooks = viewMode === 'liked' ? filteredLooks : filteredLooks.slice(0, 48);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="flex min-h-screen flex-col md:flex-row">
        <aside className="hidden w-80 flex-col border-r border-white/10 p-6 text-white md:flex">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-white/40">Wardrobe AI</p>
            <h1 className="text-3xl font-bold mt-2">Explore feed</h1>
            <p className="text-sm text-white/60 mt-1">AI-curated outfits tailored to your taste.</p>
          </div>

          <nav className="mt-8 flex flex-col gap-3 text-white/70">
            <button className="text-left rounded-xl border border-white/10 px-4 py-2 font-medium text-white">
              Explore feed
            </button>
            <button
              onClick={() => setViewMode('liked')}
              className="text-left rounded-xl border border-white/10 px-4 py-2 hover:border-white/40 hover:text-white transition"
            >
              Looks you liked ({Object.values(likes).filter(Boolean).length})
            </button>
            <button
              onClick={() => navigate('/remixes')}
              className="text-left rounded-xl border border-white/10 px-4 py-2 hover:border-white/40 hover:text-white transition"
            >
              Your remixes
            </button>
            <button
              onClick={() => navigate('/outfit-builder')}
              className="text-left rounded-xl border border-white/10 px-4 py-2 hover:border-white/40 hover:text-white transition"
            >
              My saved items
            </button>
            <button
              onClick={() => navigate('/style-quiz')}
              className="text-left rounded-xl border border-white/10 px-4 py-2 hover:border-white/40 hover:text-white transition"
            >
              Update style profile
            </button>
            <button
              onClick={() => navigate('/explore-admin')}
              className="text-left rounded-xl border border-white/10 px-4 py-2 hover:border-white/40 hover:text-white transition"
            >
              Manage explore looks
            </button>
          </nav>

          <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 overflow-hidden">
                {userPhoto ? (
                  <img src={userPhoto} alt="Your base photo" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-white/80" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.4em] text-white/40">Your base photo</p>
                <p
                  className="font-semibold text-white truncate"
                  title={user ? user.email : 'Wardrobe user'}
                >
                  {user ? user.email : 'Wardrobe user'}
                </p>
                <p className="text-xs text-white/50">Used for try-on renders</p>
              </div>
            </div>
            <button
              onClick={() => setIsPhotoModalOpen(true)}
              className="w-full rounded-xl border border-white/20 py-2 text-sm hover:bg-white/10 transition"
            >
              Update photo
            </button>
          </div>

          {remixQueue.length > 0 && (
            <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-4 space-y-3">
              <div className="flex items-center gap-2 text-white/60 text-xs uppercase tracking-[0.4em]">
                <Sparkles className="w-4 h-4 text-amber-300" />
                Remix updates
              </div>
              <div className="space-y-2">
                {remixQueue.slice(0, 4).map((entry) => (
                  <button
                    key={`${entry.id}_sidebar_${entry.timestamp}`}
                    onClick={() => openRemixDetailPage(entry)}
                    className="w-full rounded-2xl border border-white/10 bg-black/40 p-3 text-left flex items-center gap-3 hover:border-white/30 transition"
                  >
                    <div className="w-12 h-16 rounded-xl overflow-hidden bg-white/10">
                      {entry.imageUrl || entry.referenceImage ? (
                        <img
                          src={entry.imageUrl || entry.referenceImage}
                          alt={entry.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-white/50">
                          Pending
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium truncate">{entry.name}</p>
                      <p className="text-xs text-white/50">{formatRemixTime(entry.timestamp)}</p>
                    </div>
                  </button>
                ))}
                {remixQueue.length > 4 && (
                  <p className="text-xs text-center text-white/40">+{remixQueue.length - 4} more</p>
                )}
              </div>
            </div>
          )}

          <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-4 space-y-2 text-sm text-white/80">
            <p className="text-xs uppercase tracking-[0.4em] text-white/40">Style tips</p>
            <ul className="list-disc space-y-1 pl-4">
              <li>Tap a look to open the detailed view with individual items.</li>
              <li>Use Try on to apply the outfit to your base photo.</li>
              <li>Toggle between saved looks and the live feed anytime.</li>
            </ul>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-white/40">
                {viewMode === 'liked' ? 'Saved looks' : 'Live explore feed'}
              </p>
              <h2 className="text-2xl font-semibold">
                {viewMode === 'liked' ? 'Looks you liked' : 'Discover new outfits'}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex rounded-full border border-white/20 bg-white/5 p-1">
                <button
                  onClick={() => setViewMode('explore')}
                  className={`px-4 py-1 text-sm rounded-full ${
                    viewMode === 'explore' ? 'bg-white text-black font-semibold' : 'text-white/70'
                  }`}
                >
                  All looks
                </button>
                <button
                  onClick={() => setViewMode('liked')}
                  className={`px-4 py-1 text-sm rounded-full ${
                    viewMode === 'liked' ? 'bg-white text-black font-semibold' : 'text-white/70'
                  }`}
                >
                  Liked ({Object.values(likes).filter(Boolean).length})
                </button>
              </div>
              <div className="inline-flex rounded-full border border-white/20 bg-white/5 p-1">
                <button
                  onClick={() => setGender('female')}
                  className={`px-4 py-1 text-sm rounded-full ${
                    gender === 'female' ? 'bg-white text-black font-semibold' : 'text-white/70'
                  }`}
                >
                  Woman
                </button>
                <button
                  onClick={() => setGender('male')}
                  className={`px-4 py-1 text-sm rounded-full ${
                    gender === 'male' ? 'bg-white text-black font-semibold' : 'text-white/70'
                  }`}
                >
                  Man
                </button>
              </div>
              <button
                onClick={() => setLooks((prev) => shuffleLooks(prev))}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm hover:border-white/40 transition"
                title="Shuffle looks"
              >
                <RefreshCw className="w-4 h-4" />
                Shuffle
              </button>
            </div>
          </div>

          {!userPhoto && (
            <div className="mt-6 rounded-3xl border border-yellow-500/30 bg-yellow-500/10 text-yellow-100 p-4 text-sm">
              Upload a photo in the personal styling flow to unlock remixing.
            </div>
          )}

          {remixQueue.length > 0 && (
            <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-4 space-y-3 md:hidden">
              <div className="flex items-center gap-2 text-white/70 text-xs uppercase tracking-[0.3em]">
                <Sparkles className="w-4 h-4 text-amber-300" />
                Remix updates
              </div>
              <div className="space-y-2">
                {remixQueue.map((entry) => (
                  <button
                    key={`${entry.id}_mobile_${entry.timestamp}`}
                    onClick={() => openRemixDetailPage(entry)}
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
                      <p className="text-xs text-white/60">Ready → {formatRemixTime(entry.timestamp)}</p>
                    </div>
                    <span className="text-xs text-amber-300 font-semibold uppercase">View</span>
                  </button>
                ))}
              </div>
            </div>
          )}
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-white mb-4 mx-auto" />
                  <p className="text-white/60">Loading looks...</p>
                </div>
              </div>
            ) : loadError ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center max-w-md">
                  <p className="text-red-400 mb-4">{loadError}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : filteredLooks.length === 0 ? (
              <div className="text-center text-white/60 py-20">
                <p className="text-xl font-semibold">
                  {viewMode === 'liked' ? 'No liked looks yet' : 'No looks found'}
                </p>
                <p className="text-white/50 mt-2">
                  {viewMode === 'liked'
                    ? 'Tap the heart icon on any explore card to save it here.'
                    : 'Try adjusting your filters or check another gender.'}
                </p>
              </div>
            ) : (
              <>
                {viewMode === 'explore' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
                  {displayLooks.map((look) => {
                    const isActive = activeTryOnId === look.id;
                    return (
                      <article
                        key={look.id}
                        className="group cursor-pointer bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all duration-200"
                        onClick={() => navigate(`/look/${look.id}`)}
                      >
                        {/* Image with hover actions overlay */}
                        <div className="relative aspect-[9/16] overflow-hidden">
                          <img
                            src={look.imageUrl}
                            alt={look.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {/* Overlay with actions on hover */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                          <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <div className="flex items-center justify-between text-sm border-t border-white/10 pt-3 gap-2 flex-wrap">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleLike(look);
                                }}
                                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border transition ${
                                  likes[look.id]
                                    ? 'bg-green-500 text-white border-green-500 hover:bg-green-600'
                                    : 'border-white/30 text-white/80 hover:text-white'
                                }`}
                              >
                                <Heart className="w-4 h-4" />
                                {likes[look.id] ? 'Saved' : 'Like'}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemix(look);
                                }}
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
                          </div>
                        </div>
                        {/* Title */}
                        <div className="p-3 border-t border-white/5">
                          <h3 className="font-medium text-white mb-1">{look.title}</h3>
                          <p className="text-sm text-white/70 line-clamp-2">{look.description}</p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {displayLooks.map((look) => {
                    const isActive = activeTryOnId === look.id;
                    return (
                      <article
                        key={look.id}
                        className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-xl group h-full flex flex-col cursor-pointer hover:border-white/20 transition-all"
                        onClick={() => navigate(`/look/${look.id}`)}
                      >
                        <div className="relative">
                          <img
                            src={look.imageUrl}
                            alt={look.title}
                            className="w-full object-cover group-hover:scale-105 transition-transform duration-300"
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
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLike(look);
                            }}
                          >
                            <Heart className="w-4 h-4" />
                            {likes[look.id] ? 'Saved' : 'Like'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemix(look);
                            }}
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
              )}
              </>
            )}
        </main>
      </div>

      {/* Toast Notification */}
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

      {/* Photo Upload Modal */}
      {isPhotoModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 space-y-3">
              <h3 className="text-xl font-semibold text-gray-900">Upload your photo</h3>
              <p className="text-sm text-gray-600">
                We use this photo privately to render outfits on you. Files never leave this device except for the AI edit.
              </p>
            </div>
            <div className="flex-1 overflow-hidden px-6 pb-6">
              {uploadPreview ? (
                <div className="flex h-full flex-col gap-4">
                  <div className="rounded-2xl bg-gray-100 overflow-hidden border border-gray-200 h-[55vh]">
                    <img src={uploadPreview} alt="Upload preview" className="w-full h-full object-contain" />
                  </div>
                  {uploadError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                      {uploadError}
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveUploadedPhoto}
                      className="flex-1 px-4 py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors"
                    >
                      Use This Photo
                    </button>
                    <button
                      onClick={() => {
                        setIsPhotoModalOpen(false);
                        setUploadPreview(null);
                        setUploadError(null);
                        setPendingLook(null);
                      }}
                      className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex h-full flex-col gap-4">
                  <label className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 text-gray-500 hover:bg-gray-100 cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 5 * 1024 * 1024) {
                            setUploadError('Image must be smaller than 5MB');
                            return;
                          }

                          const reader = new FileReader();
                          reader.onload = (ev) => setUploadPreview(ev.target?.result as string);
                          reader.onerror = () => setUploadError('Failed to read image');
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                    <span className="text-sm font-medium">Click to choose a photo</span>
                    <span className="text-xs text-gray-400 mt-1">Accepted: JPG, PNG, WebP (Max 5MB)</span>
                  </label>
                  {uploadError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                      {uploadError}
                    </div>
                  )}
                  <button
                    onClick={() => setIsPhotoModalOpen(false)}
                    className="w-full px-4 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExplorePage;
