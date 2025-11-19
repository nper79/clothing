import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LikedItem, Category } from '../types/lookBuilder';
import { ArrowLeft, Heart, HeartOff, Sparkles, Filter, X } from 'lucide-react';

const categories: Category[] = [
  { id: 'headwear', name: 'Headwear', icon: '👒' },
  { id: 'tops', name: 'Tops', icon: '👕' },
  { id: 'bottoms', name: 'Bottoms', icon: '👖' },
  { id: 'dresses', name: 'Dresses', icon: '👗' },
  { id: 'outerwear', name: 'Outerwear', icon: '🧥' },
  { id: 'footwear', name: 'Footwear', icon: '👟' },
  { id: 'accessories', name: 'Accessories', icon: '👜' }
];

export default function OutfitBuilderCorrect() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [likedItems, setLikedItems] = useState<LikedItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load liked items when user changes
  useEffect(() => {
    if (user) {
      const savedLikedItems = localStorage.getItem(`likedItems_${user.id}`);
      if (savedLikedItems) {
        try {
          setLikedItems(JSON.parse(savedLikedItems));
        } catch (err) {
          console.error('Failed to parse liked items:', err);
          setLikedItems([]);
        }
      } else {
        setLikedItems([]);
      }
    } else {
      // Redirect to login if not authenticated
      navigate('/auth');
      return;
    }
    setIsLoading(false);
  }, [user, navigate]);

  const handleUnlikeItem = (itemId: string) => {
    if (!user) return;

    const updatedItems = likedItems.filter(item => item.id !== itemId);
    setLikedItems(updatedItems);
    localStorage.setItem(`likedItems_${user.id}`, JSON.stringify(updatedItems));
  };

  const handleUnlikeAll = () => {
    if (!user) return;
    if (!confirm('Are you sure you want to remove all liked items?')) return;

    setLikedItems([]);
    localStorage.setItem(`likedItems_${user.id}`, JSON.stringify([]));
  };

  const filteredItems = selectedCategory
    ? likedItems.filter(item => item.category.id === selectedCategory.id)
    : likedItems;

  // Group items by category
  const itemsByCategory = categories.reduce((acc, category) => {
    acc[category.id] = likedItems.filter(item => item.category.id === category.id);
    return acc;
  }, {} as Record<string, LikedItem[]>);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading your collection...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Please sign in to view your outfit builder</p>
          <button
            onClick={() => navigate('/auth')}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Sign In
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
            <h1 className="text-xl font-bold">Outfit Builder</h1>
            <div className="text-sm text-gray-400">
              {likedItems.length} item{likedItems.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Stats */}
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold mb-2">Your Style Collection</h2>
          <p className="text-gray-400">
            Build your personal wardrobe by liking items from different looks
          </p>
        </div>

        {/* Category Filters */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <h3 className="text-lg font-semibold">Filter by Category</h3>
            </div>
            {selectedCategory && (
              <button
                onClick={() => setSelectedCategory(null)}
                className="flex items-center space-x-1 text-sm text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
                <span>Clear</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`p-3 rounded-xl border transition-all text-center ${
                !selectedCategory
                  ? 'bg-blue-500 border-blue-500 text-white'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-300'
              }`}
            >
              <div className="text-2xl mb-1">👗</div>
              <div className="text-xs font-medium">All Items</div>
              <div className="text-xs opacity-70">{likedItems.length}</div>
            </button>

            {categories.map(category => {
              const count = itemsByCategory[category.id]?.length || 0;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category)}
                  className={`p-3 rounded-xl border transition-all text-center ${
                    selectedCategory?.id === category.id
                      ? 'bg-blue-500 border-blue-500 text-white'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-300'
                  } ${count === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={count === 0}
                >
                  <div className="text-2xl mb-1">{category.icon}</div>
                  <div className="text-xs font-medium">{category.name}</div>
                  <div className="text-xs opacity-70">{count}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Items Grid */}
        <div className="mb-8">
          {filteredItems.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4 opacity-20">👗</div>
              <h3 className="text-xl font-semibold text-gray-400 mb-2">
                {selectedCategory ? `No ${selectedCategory.name.toLowerCase()} items yet` : 'No items in your collection'}
              </h3>
              <p className="text-gray-500 mb-6">
                {selectedCategory
                  ? 'Try liking some items from this category'
                  : 'Start by liking items from explore looks'
                }
              </p>
              <button
                onClick={() => navigate('/explore')}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Explore Looks
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredItems.map(item => (
                <div
                  key={item.id}
                  className="group relative bg-white/5 rounded-2xl overflow-hidden border border-white/10 hover:border-white/20 transition-all"
                >
                  <div className="aspect-square relative">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    {/* Category Badge */}
                    <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm rounded-full px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.category.icon}
                    </div>

                    {/* Unlike Button */}
                    <button
                      onClick={() => handleUnlikeItem(item.id)}
                      className="absolute bottom-2 right-2 bg-red-500 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-all hover:scale-110 hover:bg-red-600"
                    >
                      <HeartOff className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="p-3">
                    <p className="text-sm font-medium truncate mb-1">{item.name}</p>
                    <p className="text-xs text-gray-400 mb-2">{item.category.name}</p>
                    <p className="text-xs text-gray-500 truncate">From: {item.lookTitle}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        {likedItems.length > 0 && (
          <div className="text-center space-y-4">
            <div className="rounded-2xl border border-purple-500/30 bg-purple-500/10 p-6 max-w-md mx-auto">
              <Sparkles className="h-8 w-8 text-purple-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold mb-2">Ready to build outfits?</h3>
              <p className="text-sm text-gray-400 mb-4">
                Mix and match your favorite items to create perfect looks
              </p>
              <button
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 font-medium"
              >
                Create Outfit (Coming Soon)
              </button>
            </div>

            <button
              onClick={handleUnlikeAll}
              className="text-sm text-gray-500 hover:text-red-400 transition-colors"
            >
              Clear All Items
            </button>
          </div>
        )}
      </div>
    </div>
  );
}