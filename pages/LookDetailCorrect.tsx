import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { ExploreService } from '../services/exploreService';
import { LikedItem, Category } from '../types/lookBuilder';
import { ArrowLeft, Heart, RefreshCw, Sparkles } from 'lucide-react';

interface Look {
  id: string;
  title: string;
  description?: string;
  prompt?: string;
  gridImageUrl: string;
  gridCellUrls: string[];
  items?: any[];
  gender: 'male' | 'female';
  likes: number;
  isLiked: boolean;
  user?: {
    id: string;
    name: string;
    avatar?: string;
  };
  createdAt: string;
}

const categories: Category[] = [
  { id: 'headwear', name: 'Headwear', icon: '' },
  { id: 'tops', name: 'Tops', icon: '' },
  { id: 'bottoms', name: 'Bottoms', icon: '' },
  { id: 'dresses', name: 'Dresses', icon: '' },
  { id: 'outerwear', name: 'Outerwear', icon: '' },
  { id: 'footwear', name: 'Footwear', icon: '' },
  { id: 'accessories', name: 'Accessories', icon: '' }
];

const LookDetailCorrect: React.FC = () => {
  const { lookId } = useParams<{ lookId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [look, setLook] = useState<Look | null>(null);
  const [likedItems, setLikedItems] = useState<LikedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTryingOn, setIsTryingOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem(`likedItems_${user.id}`);
      setLikedItems(saved ? JSON.parse(saved) : []);
    } else {
      setLikedItems([]);
    }
  }, [user]);

  const loadLook = useCallback(async () => {
    if (!lookId || hasLoaded) return;

    try {
      setIsLoading(true);
      setHasLoaded(true);

      const [maleLooks, femaleLooks] = await Promise.all([
        ExploreService.getLooks('male'),
        ExploreService.getLooks('female')
      ]);

      const dataset = [...maleLooks, ...femaleLooks];
      const found = dataset.find((entry) => entry.id === lookId);
      if (!found) {
        setError('Look not found');
        return;
      }
      setLook(found);

      try {
        const detailed = await ExploreService.getLookWithItems(lookId);
        setLook(detailed);
      } catch (err) {
        console.warn('Could not load detailed look items', err);
      }
    } catch (err) {
      console.error('Failed to load look', err);
      setError('Failed to load look');
      setHasLoaded(false);
    } finally {
      setIsLoading(false);
    }
  }, [lookId, hasLoaded]);

  useEffect(() => {
    if (!hasLoaded) {
      loadLook();
    }
  }, [loadLook, hasLoaded]);

  useEffect(() => {
    setHasLoaded(false);
    setLook(null);
    setError(null);
    setIsLoading(true);
  }, [lookId]);

  const categorizeItem = (itemName: string): Category => {
    const name = itemName.toLowerCase();
    if (name.includes('hat') || name.includes('cap') || name.includes('beanie')) return categories[0];
    if (name.includes('coat') || name.includes('jacket') || name.includes('blazer')) return categories[4];
    if (name.includes('dress')) return categories[3];
    if (name.includes('pants') || name.includes('trousers') || name.includes('jeans') || name.includes('skirt')) return categories[2];
    if (name.includes('shoe') || name.includes('boot') || name.includes('sneaker') || name.includes('heel')) return categories[5];
    if (name.includes('bag') || name.includes('purse') || name.includes('scarf') || name.includes('belt') || name.includes('jewel')) return categories[6];
    return categories[1];
  };

  const handleLikeItem = (itemIndex: number, itemName: string, imageUrl: string) => {
    if (!user) {
      alert('Please sign in to like items');
      return;
    }

    const itemId = `${lookId}_${itemIndex}`;
    const category = categorizeItem(itemName);
    const existingIndex = likedItems.findIndex((item) => item.id === itemId);

    if (existingIndex >= 0) {
      const updated = likedItems.filter((item) => item.id !== itemId);
      setLikedItems(updated);
      localStorage.setItem(`likedItems_${user.id}`, JSON.stringify(updated));
    } else {
      const newItem: LikedItem = {
        id: itemId,
        name: itemName,
        imageUrl,
        category,
        lookId: lookId!,
        lookTitle: look?.title || '',
        likedAt: new Date().toISOString()
      };
      const updated = [...likedItems, newItem];
      setLikedItems(updated);
      localStorage.setItem(`likedItems_${user.id}`, JSON.stringify(updated));
    }
  };

  const isItemLiked = (index: number) =>
    likedItems.some((item) => item.id === `${lookId}_${index}` && item.lookId === lookId);

  const handleTryOnLook = async () => {
    if (!user || !look) {
      alert('Please sign in to try on looks');
      return;
    }
    setIsTryingOn(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 2500));
      alert('Try on completed!');
    } catch (err) {
      console.error('Try on failed', err);
      alert('Failed to try on look. Please try again.');
    } finally {
      setIsTryingOn(false);
    }
  };

  const handleLikeLook = () => {
    if (!user || !look) {
      alert('Please sign in to like looks');
      return;
    }
    const newIsLiked = !look.isLiked;
    const newLikesCount = newIsLiked ? (look.likes || 0) + 1 : Math.max((look.likes || 0) - 1, 0);
    setLook({ ...look, isLiked: newIsLiked, likes: newLikesCount });
    ExploreService.likeLook(look);
  };

  const likesCount = look?.likes ?? 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white/70 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 rounded-full border-2 border-white/20 border-t-white mx-auto animate-spin" />
          <p>Loading look...</p>
        </div>
      </div>
    );
  }

  if (error || !look) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-300">{error || 'Look not found'}</p>
          <button
            onClick={() => navigate('/explore')}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2 text-sm text-white/80 hover:text-white hover:border-white/40 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Explore
          </button>
        </div>
      </div>
    );
  }

  const likedItemsForLook = likedItems.filter((item) => item.lookId === look.id);

  return (
    <div className="min-h-screen bg-black text-white px-4 pb-12">
      <div className="mx-auto max-w-6xl space-y-8 py-10">
        <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-4 backdrop-blur-sm flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <button
            onClick={() => navigate('/explore')}
            className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Explore
          </button>
          <div className="text-center flex-1">
            <p className="text-xs uppercase tracking-[0.4em] text-white/40">Look detail</p>
            <h1 className="text-2xl font-semibold text-white mt-1">{look.title}</h1>
          </div>
          <button
            onClick={handleLikeLook}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
              look.isLiked ? 'border-emerald-400 text-emerald-200 bg-emerald-500/10' : 'border-white/20 text-white/70 hover:text-white'
            }`}
          >
            <Heart className={`h-4 w-4 ${look.isLiked ? 'fill-current' : ''}`} />
            {look.isLiked ? 'Saved' : likesCount > 0 ? `Like (${likesCount})` : 'Like'}
          </button>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.55fr)_minmax(0,0.45fr)]">
          <div className="rounded-[2.25rem] overflow-hidden border border-white/10 bg-white/5 shadow-[0_0_60px_rgba(15,23,42,0.4)]">
            <img
              src={look.imageUrl}
              alt={look.title}
              className="w-full h-full object-cover"
              style={{ aspectRatio: '9 / 16' }}
            />
          </div>

          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-3">
              <button
                onClick={() => navigate('/explore')}
                className="rounded-2xl border border-white/30 bg-white/5 px-4 py-3 text-sm text-white/80 hover:text-white hover:border-white/60 transition flex items-center justify-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                onClick={handleTryOnLook}
                disabled={!user || isTryingOn}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2 border transition ${
                  !user || isTryingOn
                    ? 'border-amber-200 text-amber-200/80 bg-amber-400/10 cursor-not-allowed'
                    : 'border-white/30 text-white/90 hover:text-white hover:border-white/60 bg-white/5'
                }`}
              >
                {isTryingOn ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Trying on...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Try On
                  </>
                )}
              </button>
              <button
                onClick={() => navigate('/outfit-builder')}
                className="rounded-2xl border border-white/30 bg-white/5 px-4 py-3 text-sm text-white/80 hover:text-white hover:border-white/60 transition flex items-center justify-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                My Items
              </button>
            </div>

            {likedItemsForLook.length > 0 && (
              <div className="rounded-3xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                <p className="font-semibold">
                  You have {likedItemsForLook.length} liked item
                  {likedItemsForLook.length > 1 ? 's' : ''} from this look.
                </p>
                <button
                  onClick={() => navigate('/outfit-builder')}
                  className="mt-2 text-emerald-200 underline text-xs hover:text-emerald-100"
                >
                  View all liked items →
                </button>
              </div>
            )}

            {look.items && look.items.length > 0 && (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.4em] text-white/40 mb-4">Individual items - tap to like</p>
                <div className="grid grid-cols-2 gap-4">
                  {look.items.map((item, index) => {
                    const imageUrl = look.gridCellUrls?.[index];
                    if (!imageUrl || !imageUrl.trim()) return null;
                    const itemName = item.description || item.searchQuery || `Item ${index + 1}`;
                    const category = categorizeItem(itemName);
                    const liked = isItemLiked(index);
                    return (
                      <button
                        type="button"
                        key={index}
                        onClick={() => handleLikeItem(index, itemName, imageUrl)}
                        className={`text-left rounded-2xl border transition-all overflow-hidden bg-slate-900/40 hover:border-white/40 ${
                          liked ? 'border-pink-400/50' : 'border-white/10'
                        }`}
                      >
                        <div className="relative aspect-square overflow-hidden">
                          <img
                            src={imageUrl}
                            alt={itemName}
                            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                          />
                          <div
                            className={`absolute top-2 right-2 rounded-full p-2 backdrop-blur-md ${
                              liked ? 'bg-pink-500 text-white' : 'bg-black/60 text-white/70'
                            }`}
                          >
                            <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
                          </div>
                        </div>
                        <div className="p-3">
                          <p className="text-sm font-medium text-white truncate">{itemName}</p>
                          <p className="text-xs text-white/50 capitalize">{category.name}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="rounded-3xl border border-purple-500/30 bg-purple-500/10 p-4 text-sm text-white/80">
              <p className="font-semibold text-purple-100 mb-2">Style tip</p>
              <p className="text-xs text-white/70">
                Save the pieces you love and visit the Outfit Builder to remix them with new discoveries. Your liked items feed the AI so every new look feels closer to your taste.
              </p>
              <button
                onClick={() => navigate('/outfit-builder')}
                className="mt-3 inline-flex items-center gap-1 text-xs text-purple-200 underline hover:text-purple-100"
              >
                Go to Outfit Builder →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LookDetailCorrect;
