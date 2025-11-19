import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import { ExploreService } from '../services/exploreService';
import { LikedItem, DroppedItem, Category } from '../types/lookBuilder';
import { ArrowLeft, Heart, HeartOff, Upload, Sparkles } from 'lucide-react';

interface Look {
  id: string;
  title: string;
  description?: string;
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

export default function LookDetailPageFixed() {
  const { lookId } = useParams<{ lookId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [look, setLook] = useState<Look | null>(null);
  const [likedItems, setLikedItems] = useState<LikedItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [droppedItems, setDroppedItems] = useState<DroppedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isTryingOn, setIsTryingOn] = useState(false);
  const [tryOnResult, setTryOnResult] = useState<string | null>(null);

  // Load liked items separately when user changes
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

  const handleDragStart = (e: React.DragEvent, item: LikedItem) => {
    console.log('[DragStart] Starting drag for item:', item.name);
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', JSON.stringify(item));
    e.dataTransfer.setData('itemId', item.id);

    // Add visual feedback
    const target = e.target as HTMLElement;
    target.style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    // Reset visual feedback
    const target = e.target as HTMLElement;
    target.style.opacity = '1';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';

    // Add visual feedback to drop zone
    const dropZone = e.currentTarget;
    dropZone.classList.add('bg-purple-50');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Remove visual feedback from drop zone
    const dropZone = e.currentTarget;
    dropZone.classList.remove('bg-purple-50');
  };

  const handleDrop = (e: React.DragEvent, zone?: string) => {
    e.preventDefault();
    console.log('[Drop] Item dropped!');

    // Remove visual feedback
    const dropZone = e.currentTarget;
    dropZone.classList.remove('bg-purple-50');

    try {
      const data = e.dataTransfer.getData('text/plain');
      if (!data) {
        console.error('[Drop] No data found in drag event');
        return;
      }

      const item: LikedItem = JSON.parse(data);
      console.log('[Drop] Parsed item:', item.name);

      const droppedItem: DroppedItem = {
        id: item.id,
        name: item.name,
        imageUrl: item.imageUrl,
        category: item.category,
        zone: zone || 'main'
      };

      setDroppedItems(prev => {
        const existingIndex = prev.findIndex(i => i.id === item.id);
        let newItems;

        if (existingIndex >= 0) {
          // Replace existing item
          newItems = [...prev];
          newItems[existingIndex] = droppedItem;
        } else {
          // Add new item
          newItems = [...prev, droppedItem];
        }

        console.log('[Drop] Updated dropped items:', newItems.length);
        return newItems;
      });
    } catch (err) {
      console.error('[Drop] Failed to drop item:', err);
    }
  };

  const removeDroppedItem = (itemId: string) => {
    setDroppedItems(prev => prev.filter(item => item.id !== itemId));
  };

  const handleTryOn = async () => {
    if (droppedItems.length === 0) {
      alert('Please add some items to try on');
      return;
    }

    setIsTryingOn(true);
    setTryOnResult(null);

    try {
      const images = droppedItems.map(item => item.imageUrl);
      // Here you would integrate with the existing try-on API
      // For now, simulate a response
      setTimeout(() => {
        // Simulate try-on result (in real implementation, this would be API call)
        setTryOnResult(droppedItems[0].imageUrl); // Placeholder
        setIsTryingOn(false);
      }, 3000);
    } catch (err) {
      console.error('Try on failed:', err);
      alert('Failed to try on items');
      setIsTryingOn(false);
    }
  };

  const filteredItems = selectedCategory
    ? likedItems.filter(item => item.category.id === selectedCategory.id)
    : likedItems;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading look...</p>
        </div>
      </div>
    );
  }

  if (error || !look) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error || 'Look not found'}</p>
          <button
            onClick={() => navigate('/explore')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Explore
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => navigate('/explore')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Explore</span>
            </button>
            <h1 className="text-xl font-bold text-gray-900">{look.title}</h1>
            <div className="w-20"></div>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar with Liked Items */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Liked Items</h2>

            {/* Category Filters */}
            <div className="space-y-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  !selectedCategory ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                }`}
              >
                All Items ({likedItems.length})
              </button>
              {categories.map(category => {
                const count = likedItems.filter(item => item.category.id === category.id).length;
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center space-x-2 ${
                      selectedCategory?.id === category.id ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                    }`}
                  >
                    <span>{category.icon}</span>
                    <span>{category.name}</span>
                    <span className="ml-auto text-xs bg-gray-200 px-2 py-1 rounded-full">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Liked Items Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {filteredItems.length === 0 ? (
              <p className="text-gray-500 text-center">
                {selectedCategory ? `No ${selectedCategory.name.toLowerCase()} liked yet` : 'No items liked yet'}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredItems.map(item => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item)}
                    onDragEnd={handleDragEnd}
                    className="group relative cursor-move bg-gray-50 rounded-lg overflow-hidden hover:shadow-md transition-all border-2 border-transparent hover:border-blue-300"
                  >
                    <div className="aspect-square relative">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all" />
                      <div className="absolute top-1 right-1 bg-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-all">
                        <span className="text-xs">{item.category.icon}</span>
                      </div>
                    </div>
                    <p className="p-2 text-xs text-gray-700 truncate">{item.name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content - Human Silhouette */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 p-8">
            <div className="bg-white rounded-lg shadow-lg h-full flex flex-col items-center justify-center">
              <h3 className="text-lg font-semibold mb-6 text-gray-800">Dressing Room</h3>

              {/* Human Silhouette */}
              <div
                className="relative w-80 h-96 border-4 border-dashed border-gray-300 rounded-lg flex items-center justify-center transition-all duration-200"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, 'main')}
              >
                {droppedItems.length === 0 ? (
                  <div className="text-center">
                    <div className="text-6xl mb-4">👤</div>
                    <p className="text-gray-500">Drag items here to start</p>
                    <p className="text-sm text-gray-400 mt-2">Drop zone for your outfit</p>
                  </div>
                ) : (
                  <div className="relative w-full h-full">
                    {/* Silhouette outline */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-8xl opacity-10">👤</div>
                    </div>

                    {/* Display dropped items on silhouette */}
                    {droppedItems.map((item, index) => (
                      <div
                        key={item.id}
                        className="absolute cursor-pointer group animate-in fade-in duration-200"
                        style={{
                          top: getTopPosition(item.category),
                          left: '50%',
                          transform: 'translateX(-50%)',
                          zIndex: index + 10
                        }}
                      >
                        <div className="relative">
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-20 h-20 object-cover rounded-lg border-3 border-white shadow-lg hover:scale-110 transition-transform"
                          />
                          <div className="absolute -top-1 -right-1 bg-white rounded-full p-1 shadow-md">
                            <span className="text-xs">{item.category.icon}</span>
                          </div>
                          <button
                            onClick={() => removeDroppedItem(item.id)}
                            className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-lg"
                          >
                            <HeartOff className="h-3 w-3" />
                          </button>
                        </div>
                        <p className="text-xs text-center mt-1 bg-white/80 rounded px-1 truncate max-w-[80px]">
                          {item.name}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Try On Button */}
              {droppedItems.length > 0 && (
                <div className="mt-8 space-y-4">
                  <button
                    onClick={handleTryOn}
                    disabled={isTryingOn}
                    className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {isTryingOn ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Trying on...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5" />
                        <span>Try On</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setDroppedItems([])}
                    className="w-full px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Clear All
                  </button>
                </div>
              )}

              {/* Try On Result */}
              {tryOnResult && (
                <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 font-medium mb-2">Try-on complete! 🎉</p>
                  <div className="w-32 h-32 mx-auto">
                    <img src={tryOnResult} alt="Try on result" className="w-full h-full object-cover rounded-lg" />
                  </div>
                </div>
              )}

              {/* Debug Information */}
              <div className="mt-6 text-xs text-gray-500 text-center">
                <p>Dropped items: {droppedItems.length}</p>
                <p>Liked items: {likedItems.length}</p>
                <p className="mt-2">💡 Tip: Drag items from the left sidebar to the silhouette</p>
              </div>
            </div>
          </div>

          {/* Original Look Items */}
          {look && look.gridCellUrls && look.gridCellUrls.length > 0 && (
            <div className="border-t border-gray-200 bg-white p-6">
              <h3 className="text-lg font-semibold mb-4">Items from {look.title}</h3>
              <div className="grid grid-cols-4 gap-4">
                {look.gridCellUrls.map((url, index) => {
                  const itemName = look.items?.[index]?.description || `Item ${index + 1}`;
                  const isLiked = likedItems.some(item => item.id === `${lookId}_${index}`);

                  return (
                    <div key={index} className="relative group">
                      <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                        <img
                          src={url}
                          alt={itemName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-sm text-gray-700 truncate">{itemName}</p>
                        <button
                          onClick={() => handleLikeItem(index, itemName, url)}
                          className={`p-1 rounded-full transition-colors ${
                            isLiked
                              ? 'text-red-500 hover:text-red-600'
                              : 'text-gray-400 hover:text-red-500'
                          }`}
                        >
                          {isLiked ? <Heart className="h-4 w-4 fill-current" /> : <Heart className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper function to position items on silhouette
function getTopPosition(category: Category): string {
  switch (category.id) {
    case 'headwear': return '10%';
    case 'tops': return '25%';
    case 'outerwear': return '20%';
    case 'dresses': return '25%';
    case 'bottoms': return '45%';
    case 'footwear': return '75%';
    case 'accessories': return '60%';
    default: return '40%';
  }
}