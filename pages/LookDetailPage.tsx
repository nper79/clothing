import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Plus, Trash2, Save } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ExploreService } from '../services/exploreService';
import type { ExploreLook } from '../types/explore';
import type { LikedItem, OutfitBuilderItem } from '../types/lookBuilder';

const LookDetailPage: React.FC = () => {
  const { lookId } = useParams<{ lookId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [look, setLook] = useState<ExploreLook | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [likedItems, setLikedItems] = useState<LikedItem[]>([]);
  const [currentOutfit, setCurrentOutfit] = useState<OutfitBuilderItem[]>([]);
  const [outfitName, setOutfitName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const loadLook = React.useCallback(async () => {
    if (!lookId) return;

      try {
        setIsLoading(true);

        // We need to fetch both male and female looks to find the look
        console.log('[LookDetailPage] Fetching looks from API...');
        const [maleLooks, femaleLooks] = await Promise.all([
          ExploreService.getLooks('male'),
          ExploreService.getLooks('female')
        ]);

        const allLooks = [...maleLooks, ...femaleLooks];
        console.log('[LookDetailPage] Found total looks:', allLooks.length);

        const foundLook = allLooks.find(l => l.id === lookId);

        if (!foundLook) {
          setError('Look not found');
          return;
        }

        setLook(foundLook);

        // Debug: Log the look structure
        console.log('[LookDetailPage] Look found:', foundLook);
        console.log('[LookDetailPage] Has gridCellUrls:', !!foundLook.gridCellUrls, foundLook.gridCellUrls?.length);
        console.log('[LookDetailPage] Has items:', !!foundLook.items, foundLook.items?.length);

        // Load liked items from localStorage
        const savedLikedItems = localStorage.getItem(`likedItems_${user?.id || 'guest'}`);
        if (savedLikedItems) {
          setLikedItems(JSON.parse(savedLikedItems));
        }
      } catch (err) {
        console.error('Failed to load look:', err);
        setError('Failed to load look');
      } finally {
        setIsLoading(false);
      }
    };
  }, [lookId, user]);

  useEffect(() => {
    loadLook();
  }, [loadLook]);

  const handleLikeItem = async (itemIndex: number, itemName: string, imageUrl: string) => {
    if (!user) {
      alert('Please sign in to like items');
      return;
    }

    const newItem: LikedItem = {
      id: `${lookId}_${itemIndex}_${Date.now()}`,
      lookId: lookId!,
      itemName,
      itemIndex,
      imageUrl,
      gridCellUrl: imageUrl,
      searchQuery: itemName, // Use itemName directly to avoid undefined errors
      likedAt: new Date()
    };

    const updatedLikedItems = [...likedItems, newItem];
    setLikedItems(updatedLikedItems);

    // Save to localStorage
    localStorage.setItem(`likedItems_${user.id}`, JSON.stringify(updatedLikedItems));

    // Add to current outfit builder
    const category = getItemCategory(itemName);
    const outfitItem: OutfitBuilderItem = {
      id: newItem.id,
      imageUrl,
      itemName,
      category,
      position: { x: 50 + (itemIndex % 2) * 150, y: 50 + Math.floor(itemIndex / 2) * 150 }
    };
    setCurrentOutfit(prev => [...prev, outfitItem]);
  };

  const getItemCategory = (itemName: string): OutfitBuilderItem['category'] => {
    const name = itemName.toLowerCase();
    if (name.includes('dress') || name.includes('gown')) return 'dress';
    if (name.includes('jacket') || name.includes('coat') || name.includes('blazer')) return 'outerwear';
    if (name.includes('shirt') || name.includes('top') || name.includes('blouse')) return 'top';
    if (name.includes('pants') || name.includes('skirt') || name.includes('jeans')) return 'bottom';
    if (name.includes('shoes') || name.includes('boots') || name.includes('sneakers')) return 'shoes';
    return 'accessories';
  };

  const handleRemoveFromOutfit = (itemId: string) => {
    setCurrentOutfit(prev => prev.filter(item => item.id !== itemId));
  };

  const handleSaveOutfit = () => {
    if (!outfitName.trim()) {
      alert('Please enter an outfit name');
      return;
    }

    const savedOutfit = {
      id: `outfit_${Date.now()}`,
      name: outfitName,
      items: currentOutfit,
      createdAt: new Date()
    };

    // Get existing outfits
    const existingOutfits = JSON.parse(localStorage.getItem(`savedOutfits_${user?.id || 'guest'}`) || '[]');
    const updatedOutfits = [...existingOutfits, savedOutfit];

    localStorage.setItem(`savedOutfits_${user?.id || 'guest'}`, JSON.stringify(updatedOutfits));

    setShowSaveDialog(false);
    setOutfitName('');
    alert('Outfit saved successfully!');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading look...</p>
        </div>
      </div>
    );
  }

  if (error || !look) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Look not found'}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-200"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 bg-black/90 backdrop-blur-md border-b border-white/10 z-10">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white/80 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>

          <h1 className="text-xl font-semibold">{look.title}</h1>

          {currentOutfit.length > 0 && (
            <button
              onClick={() => setShowSaveDialog(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700"
            >
              <Save className="w-4 h-4" />
              Save Outfit
            </button>
          )}
        </div>
      </header>

      <div className="flex">
        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Look Image */}
          <div className="mb-8">
            <div className="rounded-2xl overflow-hidden bg-white/5 border border-white/10">
              <img
                src={look.imageUrl}
                alt={look.title}
                className="w-full h-auto max-h-[60vh] object-contain"
              />
            </div>

            {/* Look Details */}
            <div className="mt-4">
              <p className="text-white/60 text-sm mb-2">{look.description}</p>
              <p className="text-purple-400 text-sm">Vibe: {look.vibe}</p>
            </div>
          </div>

          {/* Individual Items Grid */}
          <section>
            <h2 className="text-2xl font-semibold mb-6">Individual Items</h2>
            <p className="text-white/60 mb-4">Click the heart on items you like to add them to your outfit builder</p>

            {look.gridCellUrls && look.gridCellUrls.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {look.gridCellUrls.map((itemUrl, index) => {
                  const item = look.items?.[index];
                  const isLiked = likedItems.some(li => li.lookId === lookId && li.itemIndex === index);

                  return (
                    <div
                      key={index}
                      className="relative group rounded-xl overflow-hidden bg-white/5 border border-white/10 hover:border-purple-500/50 transition-all"
                    >
                      <img
                        src={itemUrl}
                        alt={`Item ${index + 1}`}
                        className="w-full aspect-square object-cover"
                      />

                      {/* Item Info Overlay */}
                      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                        <p className="text-sm font-medium truncate">{item?.label || `Item ${index + 1}`}</p>
                      </div>

                      {/* Like Button */}
                      <button
                        onClick={() => {
                          if (!isLiked) {
                            const itemName = item?.label || `Item ${index + 1}`;
                            handleLikeItem(index, itemName, itemUrl);
                          }
                        }}
                        className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-all ${
                          isLiked
                            ? 'bg-purple-600 text-white'
                            : 'bg-black/50 text-white/80 hover:bg-purple-600/80'
                        }`}
                        disabled={isLiked}
                      >
                        <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="bg-white/5 border border-white/10 rounded-xl p-8 inline-block">
                  <p className="text-white/60 mb-2">Individual items not available</p>
                  <p className="text-white/40 text-sm">
                    {look.gridCellUrls === undefined
                      ? 'Grid items are still being processed...'
                      : 'No individual items found for this look'}
                  </p>
                </div>
              </div>
            )}
          </section>
        </main>

        {/* Outfit Builder Sidebar */}
        {currentOutfit.length > 0 && (
          <aside className="w-80 border-l border-white/10 p-6">
            <h3 className="text-lg font-semibold mb-4">Your Outfit ({currentOutfit.length})</h3>

            <div className="mb-6">
              <div className="relative rounded-xl border-2 border-dashed border-white/20 bg-white/5 h-64">
                <div className="absolute inset-0 overflow-hidden rounded-xl">
                  {currentOutfit.map((item) => (
                    <div
                      key={item.id}
                      className="absolute cursor-move hover:z-10 transition-transform"
                      style={{
                        left: `${item.position?.x || 50}px`,
                        top: `${item.position?.y || 50}px`,
                      }}
                    >
                      <div className="relative group">
                        <img
                          src={item.imageUrl}
                          alt={item.itemName}
                          className="w-16 h-16 object-cover rounded-lg border-2 border-white/20"
                        />
                        <button
                          onClick={() => handleRemoveFromOutfit(item.id)}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-white/20 text-sm">Drag items to arrange</p>
                </div>
              </div>
            </div>

            {/* Item List */}
            <div className="space-y-2">
              {currentOutfit.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                  <img
                    src={item.imageUrl}
                    alt={item.itemName}
                    className="w-10 h-10 object-cover rounded"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium truncate">{item.itemName}</p>
                    <p className="text-xs text-white/60">{item.category}</p>
                  </div>
                  <button
                    onClick={() => handleRemoveFromOutfit(item.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>

      {/* Save Outfit Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Save Your Outfit</h3>
            <input
              type="text"
              placeholder="Enter outfit name..."
              value={outfitName}
              onChange={(e) => setOutfitName(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:border-purple-500 focus:outline-none"
              autoFocus
            />
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="flex-1 px-4 py-2 border border-white/20 text-white rounded-lg hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveOutfit}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Save Outfit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LookDetailPage;
