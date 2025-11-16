import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Trash2, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ExploreService, type SavedRemix } from '../services/exploreService';
// import { ShopService, type ItemShoppingResult } from '../services/shopService'; // Disabled for style quiz
import type { ExploreLook } from '../types/explore';
import StyleAnalysisCard from '../components/StyleAnalysisCard';
import StyleAnalysisService from '../services/styleAnalysisService';
import { useStyleProfile } from '../hooks/useStyleProfile';

const RemixesPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { hasProfile } = useStyleProfile();
  const userId = user?.id ?? 'guest';
  const [remixes, setRemixes] = useState<SavedRemix[]>([]);
  const [isClearing, setIsClearing] = useState(false);
  const [isLoadingGallery, setIsLoadingGallery] = useState(true);
  const [selectedRemix, setSelectedRemix] = useState<SavedRemix | null>(null);
  const [selectedLook, setSelectedLook] = useState<ExploreLook | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const autoSelectHandled = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const loadRemixes = async () => {
      const stored = ExploreService.getRemixes(userId);
      if (cancelled) return;
      setRemixes(stored);

      if (stored.length === 0) {
        setIsLoadingGallery(false);
        return;
      }

      try {
        const hydrated = await Promise.all(
          stored.map(async (remix) => {
            if (remix.imageUrl || !remix.storagePath) {
              return remix;
            }
            try {
              const imageUrl = await ExploreService.getRemixImageUrl(remix.storagePath);
              return { ...remix, imageUrl };
            } catch (error) {
              console.error('[remixes] Failed to fetch remix image', error);
              return remix;
            }
          })
        );

        if (!cancelled) {
          setRemixes(hydrated);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingGallery(false);
        }
      }
    };

    loadRemixes();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    const state = location.state as { remixLookId?: string } | null;
    if (!state?.remixLookId || autoSelectHandled.current || remixes.length === 0) {
      return;
    }
    const match = remixes.find((remix) => remix.lookId === state.remixLookId);
    if (match) {
      openRemixDetail(match);
      autoSelectHandled.current = true;
      navigate('.', { replace: true, state: null });
    }
  }, [remixes, location.state, navigate]);

  const handleClear = async () => {
    setIsClearing(true);
    try {
      ExploreService.clearRemixes(userId);
      setRemixes([]);
      setIsLoadingGallery(false);
    } finally {
      setIsClearing(false);
    }
  };

  const openRemixDetail = async (remix: SavedRemix) => {
    setSelectedRemix(remix);
    setSelectedLook(null);
    setDetailError(null);
    setIsDetailLoading(true);
    try {
      const look = await ExploreService.getLookWithItems(remix.lookId);
      setSelectedLook(look);

      // Shopping functionality disabled for style quiz
      /*
      const items = look.items ?? [];
      if (items.length === 0) {
        setShopResults([]);
        setDetailError('This look predates our shopping data. Regenerate it to unlock shopping links.');
        return;
      }
      // ... shopping code removed ...
      */
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : 'Failed to load remix details');
    } finally {
      setIsDetailLoading(false);
    }
  };

  const closeRemixDetail = () => {
    setSelectedRemix(null);
    setSelectedLook(null);
    setDetailError(null);
    setIsDetailLoading(false);
  };

  return (
    <div className="min-h-screen bg-black text-white flex">
      <aside className="hidden md:flex flex-col w-72 border-r border-white/10 p-8 gap-8">
        <div>
          <p className="text-sm uppercase tracking-[0.4em] text-white/50">Wardrobe AI</p>
          <h1 className="text-3xl font-bold mt-2">Your Style Collection</h1>
          <p className="text-sm text-white/60 mt-2">Analyzed outfits tailored to your style</p>
        </div>

        <nav className="flex flex-col gap-4 text-white/70">
          <button className="text-left hover:text-white transition" onClick={() => navigate('/explore')}>Explore feed</button>
          <button className="text-left hover:text-white transition">Style gallery</button>
          <button className="text-left hover:text-white transition" onClick={() => navigate('/style-quiz')}>
            Update Style Profile
          </button>
          <button className="text-left hover:text-white transition" onClick={() => navigate('/explore-admin')}>
            Manage explore looks
          </button>
        </nav>

        <div className="mt-auto text-sm text-white/60 space-y-2">
          <p>Your personalized outfits with AI style analysis.</p>
          <button
            onClick={handleClear}
            disabled={remixes.length === 0 || isClearing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 text-white/70 hover:text-white disabled:opacity-40"
          >
            <Trash2 className="w-4 h-4" />
            Clear gallery
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto px-4 md:px-8 py-8">
        {isLoadingGallery ? (
          <div className="flex flex-col items-center justify-center gap-3 text-white/60 py-24">
            <Loader2 className="w-6 h-6 animate-spin" />
            <p>Loading your remixes…</p>
          </div>
        ) : remixes.length === 0 ? (
          <div className="text-center text-white/60 py-20">
            <p className="text-xl font-semibold">No remixes yet</p>
            <p className="text-white/50 mt-2">Hit "Try on" on any explore look to populate this gallery.</p>
            <button
              onClick={() => navigate('/explore')}
              className="mt-6 px-5 py-2.5 rounded-full bg-white text-black font-semibold"
            >
              Go to Explore
            </button>
          </div>
        ) : selectedRemix ? (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">Remix detail</p>
                <h2 className="text-2xl font-semibold mt-1">{selectedRemix.lookName}</h2>
                <p className="text-sm text-white/60">{new Date(selectedRemix.createdAt).toLocaleString()}</p>
              </div>
              <button
                onClick={closeRemixDetail}
                className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/70 hover:text-white"
              >
                Back to gallery
              </button>
            </div>
            {isDetailLoading ? (
              <div className="flex flex-col items-center justify-center gap-4 text-white/60 py-16">
                <Loader2 className="w-6 h-6 animate-spin" />
                <p>Loading style analysis…</p>
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-[minmax(0,0.55fr)_minmax(0,0.45fr)]">
                <div className="space-y-4">
                  <div className="rounded-3xl border border-white/10 bg-white/5 overflow-hidden">
                    {selectedRemix.imageUrl ? (
                      <img
                        src={selectedRemix.imageUrl}
                        alt={selectedRemix.lookName}
                        className="w-full h-full object-cover"
                        style={{ aspectRatio: '9 / 16' }}
                      />
                    ) : (
                      <div className="aspect-[9/16] flex items-center justify-center text-white/50 text-sm px-6 text-center">
                        Image preview unavailable. Re-run the remix to refresh it.
                      </div>
                    )}
                  </div>
                  {selectedLook?.items && selectedLook.items.length > 0 && (
                    <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.3em] text-white/50 mb-3">Items detected</p>
                      <ul className="space-y-2 text-sm text-white/80">
                        {selectedLook.items.map((item) => (
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
                  {detailError && (
                    <div className="rounded-3xl border border-yellow-500/30 bg-yellow-500/10 text-yellow-100 text-sm p-4">
                      {detailError}
                    </div>
                  )}

                  {/* Style Analysis Card */}
                  {selectedLook && (
                    <StyleAnalysisCard
                      outfitDescription={selectedLook.prompt || selectedLook.lookName || ''}
                      lookName={selectedLook.lookName}
                      userHasProfile={hasProfile}
                    />
                  )}

                  {/* Look Description */}
                  {selectedLook?.lookName && (
                    <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                      <p className="text-xs uppercase tracking-[0.3em] text-white/50 mb-2">Look Description</p>
                      <p className="text-sm text-white/80">{selectedLook.lookName}</p>
                      {selectedLook.prompt && (
                        <p className="text-xs text-white/60 mt-2 italic">"{selectedLook.prompt.slice(0, 200)}..."</p>
                      )}
                    </div>
                  )}

                  {/* Style Tips */}
                  {!hasProfile && (
                    <div className="rounded-3xl border border-purple-500/30 bg-purple-500/10 p-4">
                      <p className="text-sm font-medium text-purple-200 mb-2">
                        💡 Want personalized style analysis?
                      </p>
                      <p className="text-xs text-white/70 mb-3">
                        Take our style quiz to get AI-powered outfit recommendations based on your unique preferences!
                      </p>
                      <button
                        onClick={() => navigate('/style-quiz')}
                        className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-medium hover:from-purple-600 hover:to-pink-600 transition"
                      >
                        Take Style Quiz
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {remixes.map((remix) => (
              <article
                key={remix.id}
                className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-xl flex flex-col cursor-pointer hover:border-white/30 transition"
                onClick={() => openRemixDetail(remix)}
              >
                <div className="w-full" style={{ aspectRatio: '9 / 16' }}>
                  {remix.imageUrl ? (
                    <img src={remix.imageUrl} alt={remix.lookName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-white/5 text-white/50 text-xs px-4 text-center">
                      Image expired. Tap "Try on" on the explore feed to refresh this look.
                    </div>
                  )}
                </div>
                <div className="p-4 space-y-1 text-sm">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">Remix</p>
                  <h3 className="font-semibold">{remix.lookName}</h3>
                  <p className="text-white/60 text-xs">{new Date(remix.createdAt).toLocaleString()}</p>
                  <p className="text-xs text-emerald-300 inline-flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Tap for style details
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default RemixesPage;

