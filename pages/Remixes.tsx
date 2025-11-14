import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ExploreService, type SavedRemix } from '../services/exploreService';

const RemixesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id ?? 'guest';
  const [remixes, setRemixes] = useState<SavedRemix[]>([]);
  const [isClearing, setIsClearing] = useState(false);
  const [isLoadingGallery, setIsLoadingGallery] = useState(true);

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

  return (
    <div className="min-h-screen bg-black text-white flex">
      <aside className="hidden md:flex flex-col w-72 border-r border-white/10 p-8 gap-8">
        <div>
          <p className="text-sm uppercase tracking-[0.4em] text-white/50">Wardrobe AI</p>
          <h1 className="text-3xl font-bold mt-2">Your remixes</h1>
        </div>

        <nav className="flex flex-col gap-4 text-white/70">
          <button className="text-left hover:text-white transition" onClick={() => navigate('/explore')}>Explore feed</button>
          <button className="text-left hover:text-white transition">Remix gallery</button>
          <button className="text-left hover:text-white transition" onClick={() => navigate('/explore-admin')}>
            Manage explore looks
          </button>
        </nav>

        <div className="mt-auto text-sm text-white/60 space-y-2">
          <p>Every remix you trigger is stored here privately.</p>
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
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {remixes.map((remix) => (
              <article
                key={remix.id}
                className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-xl flex flex-col"
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

