import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import type { LikedItem } from '../types/lookBuilder';
import { ArrowLeft, Sparkles, Trash2, Check, RefreshCw } from 'lucide-react';
import { ExploreService } from '../services/exploreService';
import { PersonalStylingService } from '../services/personalStylingService';

const OutfitBuilderCorrect: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [likedItems, setLikedItems] = useState<LikedItem[]>([]);
  const [selectedMap, setSelectedMap] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isTryingOnSelection, setIsTryingOnSelection] = useState(false);
  const [tryOnError, setTryOnError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    const saved = localStorage.getItem(`likedItems_${user.id}`);
    try {
      const parsedItems = saved ? JSON.parse(saved) : [];
      // If no saved items, add some demo items for testing
      if (parsedItems.length === 0) {
        const demoItems = [
          {
            id: 'demo_1',
            name: 'Classic White T-Shirt',
            imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
            category: { name: 'tops' },
            lookTitle: 'Casual Everyday Look',
            createdAt: new Date().toISOString()
          },
          {
            id: 'demo_2',
            name: 'Blue Denim Jeans',
            imageUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400',
            category: { name: 'bottoms' },
            lookTitle: 'Classic Denim Style',
            createdAt: new Date().toISOString()
          },
          {
            id: 'demo_3',
            name: 'White Sneakers',
            imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400',
            category: { name: 'footwear' },
            lookTitle: 'Sporty Casual Look',
            createdAt: new Date().toISOString()
          },
          {
            id: 'demo_4',
            name: 'Black Leather Jacket',
            imageUrl: 'https://images.unsplash.com/photo-1551488831-00ddcb2c79c5?w=400',
            category: { name: 'outerwear' },
            lookTitle: 'Edgy Street Style',
            createdAt: new Date().toISOString()
          }
        ];
        localStorage.setItem(`likedItems_${user.id}`, JSON.stringify(demoItems));
        setLikedItems(demoItems);
      } else {
        setLikedItems(parsedItems);
      }
    } catch (error) {
      console.error('Failed to parse liked items', error);
      setLikedItems([]);
    }
    setIsLoading(false);
  }, [user, navigate]);

  const toggleSelect = (itemId: string) => {
    setSelectedMap((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const handleCardToggle = (itemId: string) => {
    toggleSelect(itemId);
  };

  const selectedItems = useMemo(
    () => likedItems.filter((item) => selectedMap[item.id]),
    [likedItems, selectedMap]
  );

  const handleRemove = (itemId: string) => {
    if (!user) return;
    const updated = likedItems.filter((item) => item.id !== itemId);
    setLikedItems(updated);
    localStorage.setItem(`likedItems_${user.id}`, JSON.stringify(updated));
    setSelectedMap((prev) => {
      const clone = { ...prev };
      delete clone[itemId];
      return clone;
    });
  };

  const handleClearBoard = () => {
    setSelectedMap({});
  };

  const buildSelectionPrompt = (items: LikedItem[]): string => {
    const descriptions = items.map((item) => item.name || 'fashion piece');
    const categories = Array.from(
      new Set(
        items
          .map((item) => item.category?.name?.toLowerCase())
          .filter((name): name is string => Boolean(name))
      )
    );
    const list = descriptions.join(', ');
    const summary = categories.length ? categories.join(', ') : 'fashion outfit';
    const footwearNote = categories.some((cat) => cat.includes('shoe') || cat.includes('footwear'))
      ? ''
      : 'Include complementary footwear that matches the outfit.';

    return `Make the person wear ${list}. Style the outfit as a cohesive ${summary} ensemble. ${footwearNote} FULL BODY IMAGE from head to toe with footwear clearly visible. Maintain the person's natural features and keep it a solo portrait.`;
  };

  const handleTryOnSelection = async () => {
    if (!selectedItems.length || !user) return;
    setTryOnError(null);

    const userPhotoUrl = ExploreService.getLatestUserPhoto(user.id || 'guest');
    if (!userPhotoUrl) {
      setTryOnError('Upload a base photo in Explore to unlock try-ons.');
      return;
    }

    const prompt = buildSelectionPrompt(selectedItems);
    const boardId = `board_${Date.now()}`;

    try {
      setIsTryingOnSelection(true);
      const customItems = selectedItems.map((item) => ({
        id: item.id,
        name: item.name || 'Saved item',
        imageUrl: item.imageUrl,
        category: item.category?.name,
      }));
      const itemImages = selectedItems
        .map((item) => item.imageUrl)
        .filter((url): url is string => Boolean(url));

      const metadata = {
        lookId: boardId,
        name: 'Custom Outfit Board',
        category: 'custom-board',
        level: 'custom',
        originalPrompt: prompt,
        referenceImage: itemImages[0],
      };

      const remix = await PersonalStylingService.remixLook(
        user.id,
        userPhotoUrl,
        prompt,
        metadata,
        itemImages
      );
      ExploreService.saveRemix(user.id, {
        lookId: metadata.lookId,
        lookName: metadata.name,
        gender: undefined,
        storagePath: remix.storagePath,
        imageUrl: remix.styledPhotoUrl,
        customItems,
        customPrompt: prompt,
      });
      navigate('/remixes', { state: { remixLookId: metadata.lookId } });
    } catch (error) {
      console.error('Failed to try on selection', error);
      setTryOnError(error instanceof Error ? error.message : 'Failed to try on selection.');
    } finally {
      setIsTryingOnSelection(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white/70 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 rounded-full border-2 border-white/30 border-t-white mx-auto animate-spin" />
          <p>Loading your collection...</p>
        </div>
      </div>
    );
  }

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
            <p className="text-xs uppercase tracking-[0.4em] text-white/40">Outfit builder</p>
            <h1 className="text-2xl font-semibold text-white mt-1">My Items</h1>
          </div>
          <div className="text-sm text-white/60">{likedItems.length} saved</div>
        </div>

        {likedItems.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-white/70">
            <Sparkles className="h-8 w-8 mx-auto mb-4 text-white/50" />
            <p className="text-lg font-semibold">You haven't saved any items yet.</p>
            <p className="text-sm text-white/50 mt-1">Like pieces from the look detail pages and they will appear here.</p>
            <button
              onClick={() => navigate('/explore')}
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-2 text-sm text-white/80 hover:text-white"
            >
              <Sparkles className="h-4 w-4" />
              Explore looks
            </button>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.6fr)_minmax(0,0.4fr)]">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.4em] text-white/40">All liked items</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {likedItems.map((item) => {
                  const itemName = item.name || 'Saved item';
                  const categoryName = item.category?.name || 'Collection';
                  return (
                    <div
                      key={item.id}
                      className={`rounded-2xl border bg-white/5 overflow-hidden transition relative cursor-pointer ${
                        selectedMap[item.id]
                          ? 'border-pink-400/60 shadow-[0_10px_30px_rgba(236,72,153,0.25)]'
                          : 'border-white/10'
                      }`}
                      onClick={() => handleCardToggle(item.id)}
                    >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(item.id);
                      }}
                      className={`absolute top-2 left-2 rounded-full border px-2.5 py-1 text-xs font-medium flex items-center gap-1 transition z-10 ${
                        selectedMap[item.id]
                          ? 'bg-white text-black border-white'
                          : 'bg-black/60 border-white/40 text-white/90 backdrop-blur-sm'
                      }`}
                    >
                      {selectedMap[item.id] ? (
                        <>
                          <Check className="h-2.5 w-2.5" />
                          <span>Selected</span>
                        </>
                      ) : (
                        <span>Select</span>
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(item.id);
                      }}
                      className="absolute top-2 right-2 rounded-full border border-white/20 bg-black/60 p-1.5 text-white/80 hover:text-white hover:bg-black/80 transition z-10"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                    <div className="aspect-square overflow-hidden">
                      <img
                        src={item.imageUrl}
                        alt={itemName}
                        className="w-full h-full object-cover"
                        style={{ transform: 'scale(1.03)', transformOrigin: 'center' }}
                      />
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-semibold text-white truncate">{itemName}</p>
                      <p className="text-xs text-white/50 capitalize">{categoryName}</p>
                      <p className="text-xs text-white/40">
                        From {item.lookTitle || 'Explore look'}
                      </p>
                    </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 flex flex-col gap-4">
              <button
                onClick={handleTryOnSelection}
                disabled={!selectedItems.length || isTryingOnSelection}
                className={`rounded-2xl px-4 py-3 text-sm font-semibold flex items-center justify-center gap-2 border transition ${
                  selectedItems.length && !isTryingOnSelection
                    ? 'border-white/40 text-white hover:border-white/70'
                    : 'border-white/20 text-white/40 cursor-not-allowed'
                }`}
              >
                {isTryingOnSelection ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Rendering outfit...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Try On Selection
                  </>
                )}
              </button>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-white/40">Board</p>
                  <p className="text-sm text-white/70">Selected items ({selectedItems.length})</p>
                </div>
                {selectedItems.length > 0 && (
                  <button
                    onClick={handleClearBoard}
                    className="text-xs text-white/60 hover:text-white"
                  >
                    Clear
                  </button>
                )}
              </div>
              {tryOnError && (
                <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs text-red-100">
                  {tryOnError}
                </div>
              )}
              <div className="flex-1 rounded-2xl border border-white/10 bg-black/30 p-4 min-h-[320px] grid grid-cols-2 gap-3 content-start">
                {selectedItems.length === 0 ? (
                  <p className="col-span-2 text-sm text-white/40 self-center text-center">
                    Select items from the left to build an outfit.
                  </p>
                ) : (
                  selectedItems.map((item) => {
                    const itemName = item.name || 'Saved item';
                    return (
                      <div key={item.id} className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                      <div className="aspect-square overflow-hidden">
                        <img
                          src={item.imageUrl}
                          alt={itemName}
                          className="w-full h-full object-cover"
                          style={{ transform: 'scale(1.03)', transformOrigin: 'center' }}
                        />
                      </div>
                      <p className="text-xs text-white/70 truncate px-2 py-1">{itemName}</p>
                    </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OutfitBuilderCorrect;
