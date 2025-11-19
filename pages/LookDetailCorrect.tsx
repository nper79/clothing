import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { ExploreService } from '../services/exploreService';
import { LikedItem, Category } from '../types/lookBuilder';
import { ArrowLeft, Heart, HeartOff, Sparkles, RefreshCw } from 'lucide-react';

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
  { id: 'headwear', name: 'Headwear', icon: '👒' },
  { id: 'tops', name: 'Tops', icon: '👕' },
  { id: 'bottoms', name: 'Bottoms', icon: '👖' },
  { id: 'dresses', name: 'Dresses', icon: '👗' },
  { id: 'outerwear', name: 'Outerwear', icon: '🧥' },
  { id: 'footwear', name: 'Footwear', icon: '👟' },
  { id: 'accessories', name: 'Accessories', icon: '👜' }
];

export default function LookDetailCorrect() {
  const { lookId } = useParams<{ lookId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [look, setLook] = useState<Look | null>(null);
  const [likedItems, setLikedItems] = useState<LikedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTryingOn, setIsTryingOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Load liked items when user changes
  useEffect(() => {
    if (user) {
      const savedLikedItems = localStorage.getItem(`likedItems_${user.id}`);
      if (savedLikedItems) {
        setLikedItems(JSON.parse(savedLikedItems));
      } else {
        setLikedItems([]);
      }
    } else {
      setLikedItems([]);
    }
  }, [user]);

  const loadLook = React.useCallback(async () => {
    if (!lookId || hasLoaded) return;

    try {
      setIsLoading(true);
      setHasLoaded(true);

      const [maleLooks, femaleLooks] = await Promise.all([
        ExploreService.getLooks('male'),
        ExploreService.getLooks('female')
      ]);

      const allLooks = [...maleLooks, ...femaleLooks];
      const foundLook = allLooks.find(l => l.id === lookId);

      if (!foundLook) {
        setError('Look not found');
        return;
      }

      setLook(foundLook);

      // Also get detailed look with items
      try {
        const detailedLook = await ExploreService.getLookWithItems(lookId);
        setLook(detailedLook);
      } catch (err) {
        console.log('Could not load detailed look items');
      }
    } catch (err) {
      console.error('Failed to load look:', err);
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
  }, [lookId, hasLoaded, loadLook]);

  useEffect(() => {
    setHasLoaded(false);
    setLook(null);
    setError(null);
    setIsLoading(true);
  }, [lookId]);

  const categorizeItem = (itemName: string): Category => {
    const name = itemName.toLowerCase();
    if (name.includes('hat') || name.includes('cap') || name.includes('beanie') || name.includes('head')) {
      return categories.find(c => c.id === 'headwear')!;
    } else if (name.includes('coat') || name.includes('jacket') || name.includes('blazer')) {
      return categories.find(c => c.id === 'outerwear')!;
    } else if (name.includes('dress') || name.includes('gown')) {
      return categories.find(c => c.id === 'dresses')!;
    } else if (name.includes('pants') || name.includes('trousers') || name.includes('jeans') || name.includes('skirt')) {
      return categories.find(c => c.id === 'bottoms')!;
    } else if (name.includes('shoes') || name.includes('boots') || name.includes('sneakers') || name.includes('heels')) {
      return categories.find(c => c.id === 'footwear')!;
    } else if (name.includes('bag') || name.includes('purse') || name.includes('scarf') || name.includes('belt') || name.includes('jewelry')) {
      return categories.find(c => c.id === 'accessories')!;
    } else {
      return categories.find(c => c.id === 'tops')!;
    }
  };

  const handleLikeItem = async (itemIndex: number, itemName: string, imageUrl: string) => {
    if (!user) {
      alert('Please sign in to like items');
      return;
    }

    const itemId = `${lookId}_${itemIndex}`;
    const category = categorizeItem(itemName);

    const existingItemIndex = likedItems.findIndex(item => item.id === itemId);

    if (existingItemIndex >= 0) {
      const updatedItems = likedItems.filter(item => item.id !== itemId);
      setLikedItems(updatedItems);
      localStorage.setItem(`likedItems_${user.id}`, JSON.stringify(updatedItems));
    } else {
      const newItem: LikedItem = {
        id: itemId,
        name: itemName,
        imageUrl: imageUrl,
        category: category,
        lookId: lookId!,
        lookTitle: look?.title || '',
        likedAt: new Date().toISOString()
      };
      const updatedItems = [...likedItems, newItem];
      setLikedItems(updatedItems);
      localStorage.setItem(`likedItems_${user.id}`, JSON.stringify(updatedItems));
    }
  };

  const isItemLiked = (itemIndex: number) => {
    const itemId = `${lookId}_${itemIndex}`;
    return likedItems.some(item => item.id === itemId);
  };

  const handleTryOnLook = async () => {
    if (!user) {
      alert('Please sign in to try on looks');
      return;
    }

    setIsTryingOn(true);

    try {
      // Implement try on functionality
      // For now, simulate the process
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Here you would integrate with your try-on API
      // For example: const result = await TryOnAPI.tryOnLook(look.id, user.id);

      alert('Try on completed! 🎉');
    } catch (err) {
      console.error('Try on failed:', err);
      alert('Failed to try on look. Please try again.');
    } finally {
      setIsTryingOn(false);
    }
  };

  const handleLikeLook = () => {
    if (!user) {
      alert('Please sign in to like looks');
      return;
    }

    // Toggle like status
    const newIsLiked = !look.isLiked;
    setLook(prev => prev ? { ...prev, isLiked: newIsLiked } : null);

    // Update likes count
    const newLikesCount = newIsLiked ? (look?.likes || 0) + 1 : Math.max((look?.likes || 0) - 1, 0);
    setLook(prev => prev ? { ...prev, likes: newLikesCount } : null);

    // Update in ExploreService
    ExploreService.likeLook(look);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading look...</p>
        </div>
      </div>
    );
  }

  if (error || !look) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Look not found'}</p>
          <button
            onClick={() => navigate('/explore')}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Back to Explore
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate('/explore')}
              className="flex items-center space-x-2 text-gray-400 hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Explore</span>
            </button>
            <h1 className="text-xl font-bold">{look.title}</h1>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleLikeLook}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  look.isLiked
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white'
                }`}
              >
                <Heart className={`h-4 w-4 ${look.isLiked ? 'fill-current' : ''}`} />
                <span>{look.isLiked ? 'Saved' : 'Like'}</span>
                <span className="ml-1">({look.likes})</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Like Remix Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.55fr)_minmax(0,0.45fr)]">
          {/* Left - Model Photo */}
          <div>
            <div className="rounded-3xl border border-white/10 bg-white/5 overflow-hidden">
              <img
                src={look.imageUrl}
                alt={look.title}
                className="w-full h-full object-cover"
                style={{ aspectRatio: '9 / 16' }}
              />
            </div>
          </div>

          {/* Right - Look Details & Items */}
          <div className="space-y-4">
            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/explore')}
                className="flex-1 px-4 py-3 border border-white/20 text-white rounded-xl hover:bg-white/10 transition-colors flex items-center justify-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </button>
              <button
                onClick={() => handleTryOnLook()}
                disabled={!user || isTryingOn}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isTryingOn ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Trying on...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Try On</span>
                  </>
                )}
              </button>
              <button
                onClick={() => navigate('/outfit-builder')}
                className="flex-1 px-4 py-3 border border-purple-500/30 bg-purple-500/10 text-purple-300 rounded-xl hover:bg-purple-500/20 transition-colors flex items-center justify-center space-x-2"
              >
                <Sparkles className="h-4 w-4" />
                <span>My Items</span>
              </button>
            </div>

            {/* Liked Items Summary */}
            {likedItems.length > 0 && (
              <div className="rounded-3xl border border-green-500/30 bg-green-500/10 p-4">
                <p className="text-sm font-medium text-green-300 mb-2">
                  💚 You have {likedItems.length} liked item{likedItems.length > 1 ? 's' : ''} from this look!
                </p>
                <button
                  onClick={() => navigate('/outfit-builder')}
                  className="text-sm text-green-400 hover:text-green-300 underline"
                >
                  View all liked items →
                </button>
              </div>
            )}

            {/* Individual Items - Google Shopping Style */}
            {look.items && look.items.length > 0 && (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-white/50 mb-4">Individual Items (Click to Like)</p>
                <div className="grid grid-cols-2 gap-4">
                  {look.items.map((item, index) => {
                    // Check if we have a valid image for this item
                    const imageUrl = look.gridCellUrls?.[index];
                    const hasImage = imageUrl && imageUrl.trim() !== '';
                    const itemName = item.description || item.searchQuery || `Item ${index + 1}`;
                    const category = categorizeItem(itemName);
                    const isLiked = isItemLiked(index);

                    // Only show items that have images
                    if (!hasImage) return null;

                    return (
                      <div
                        key={index}
                        className={`group relative bg-white/5 rounded-xl border transition-all cursor-pointer overflow-hidden hover:border-white/20 ${
                          isLiked
                            ? 'border-red-500/30 bg-red-500/5'
                            : 'border-white/10 hover:bg-white/10'
                        }`}
                        onClick={() => handleLikeItem(index, itemName, imageUrl)}
                      >
                        {/* Item Image - Square */}
                        <div className="aspect-square relative overflow-hidden rounded-t-xl">
                          <img
                            src={imageUrl}
                            alt={itemName}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            style={{
                              objectPosition: 'center',
                              scale: '1.1' // Zoom in slightly to crop edges
                            }}
                          />

                          {/* Like Button Overlay */}
                          <div className="absolute top-2 right-2">
                            <div className={`rounded-full p-2 backdrop-blur-sm transition-colors ${
                              isLiked
                                ? 'bg-red-500/90 text-white'
                                : 'bg-black/50 text-white opacity-0 group-hover:opacity-100'
                            }`}>
                              <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                            </div>
                          </div>
                        </div>

                        {/* Item Name */}
                        <div className="p-3">
                          <p className="text-sm font-medium text-white truncate leading-tight">{itemName}</p>
                          <p className="text-xs text-gray-400 mt-1 capitalize">{category.name}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Style Tips */}
            <div className="rounded-3xl border border-purple-500/30 bg-purple-500/10 p-4">
              <p className="text-sm font-medium text-purple-200 mb-2">
                💡 Style Tip
              </p>
              <p className="text-xs text-white/70 mb-3">
                Like individual items to build your personal collection. Use the Outfit Builder to mix and match your favorite pieces!
              </p>
              <button
                onClick={() => navigate('/outfit-builder')}
                className="text-xs text-purple-400 hover:text-purple-300 underline font-medium"
              >
                Go to Outfit Builder →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
