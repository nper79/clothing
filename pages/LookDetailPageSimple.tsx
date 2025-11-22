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

export default function LookDetailPageSimple() {
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
  const [draggedItem, setDraggedItem] = useState<LikedItem | null>(null);

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
        gridCellUrl: imageUrl,
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
    console.log('Drag started for item:', item.name);
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'copy';

    // Store the item data in dataTransfer
    e.dataTransfer.setData('text/plain', JSON.stringify(item));
    e.dataTransfer.setData('itemId', item.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    console.log('Drop event triggered');

    try {
      // Get the item data from dataTransfer
      const data = e.dataTransfer.getData('text/plain');
      const itemId = e.dataTransfer.getData('itemId');

      console.log('Data from transfer:', data);
      console.log('Item ID from transfer:', itemId);

      if (!data) {
        console.log('No data found in transfer');
        return;
      }

      const item: LikedItem = JSON.parse(data);
      console.log('Parsed item from transfer:', item.name);

      const droppedItem: DroppedItem = {
        id: item.id,
        name: item.name,
        imageUrl: item.imageUrl,
        category: item.category,
        zone: 'main'
      };

      setDroppedItems(prev => {
        const exists = prev.find(i => i.id === item.id);
        if (exists) {
          console.log('Item already exists, replacing');
          return prev.map(i => i.id === item.id ? droppedItem : i);
        } else {
          console.log('Adding new item:', item.name);
          return [...prev, droppedItem];
        }
      });
    } catch (err) {
      console.error('Error parsing drag data:', err);
    } finally {
      setDraggedItem(null);
    }
  };

  const handleDragEnd = () => {
    console.log('Drag ended');
    setDraggedItem(null);
  };

  const removeDroppedItem = (itemId: string) => {
    console.log('Removing item:', itemId);
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
      setTimeout(() => {
        setTryOnResult(droppedItems[0].imageUrl);
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
                    className="group relative cursor-move bg-gray-50 rounded-lg overflow-hidden hover:shadow-lg transition-all border-2 border-transparent hover:border-blue-400"
                    style={{ cursor: 'grab' }}
                  >
                    <div className="aspect-square relative">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        draggable={false}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all" />
                      <div className="absolute top-1 right-1 bg-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-all">
                        <span className="text-xs">{item.category.icon}</span>
                      </div>
                    </div>
                    <p className="p-2 text-xs text-gray-700 truncate font-medium">{item.name}</p>
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

              {/* Drop Zone */}
              <div
                className="relative w-80 h-96 border-4 border-dashed border-gray-300 rounded-lg flex items-center justify-center transition-all duration-200 bg-gray-50"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                style={{ minHeight: '400px' }}
              >
                {droppedItems.length === 0 ? (
                  <div className="text-center p-8">
                    <div className="text-8xl mb-4 opacity-20">👤</div>
                    <p className="text-gray-500 font-medium">Drag items here</p>
                    <p className="text-sm text-gray-400 mt-2">Drop items to create your outfit</p>
                  </div>
                ) : (
                  <div className="relative w-full h-full p-4">
                    {/* Grid for dropped items */}
                    <div className="grid grid-cols-3 gap-4 h-full content-start">
                      {droppedItems.map((item) => (
                        <div
                          key={item.id}
                          className="relative group"
                        >
                          <div className="aspect-square rounded-lg overflow-hidden shadow-lg border-2 border-white">
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <button
                            onClick={() => removeDroppedItem(item.id)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all hover:scale-110 shadow-lg"
                          >
                            <HeartOff className="h-3 w-3" />
                          </button>
                          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 text-center truncate">
                            {item.category.icon} {item.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Status */}
              <div className="mt-4 text-center text-sm text-gray-600">
                Items in outfit: {droppedItems.length}
              </div>

              {/* Try On Button */}
              {droppedItems.length > 0 && (
                <div className="mt-6 space-y-3 w-full max-w-sm">
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
                    Clear All ({droppedItems.length})
                  </button>
                </div>
              )}

              {/* Try On Result */}
              {tryOnResult && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg w-full max-w-sm">
                  <p className="text-green-800 font-medium mb-2">✨ Try-on complete!</p>
                  <div className="w-32 h-32 mx-auto rounded-lg overflow-hidden">
                    <img src={tryOnResult} alt="Try on result" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}
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
