import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Edit2, Heart } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { SavedOutfit, LikedItem } from '../types/lookBuilder';

const OutfitBuilderPage: React.FC = () => {
  const { user } = useAuth();
  const [savedOutfits, setSavedOutfits] = useState<SavedOutfit[]>([]);
  const [likedItems, setLikedItems] = useState<LikedItem[]>([]);
  const [activeTab, setActiveTab] = useState<'outfits' | 'items'>('outfits');

  useEffect(() => {
    const loadData = () => {
      if (!user) return;

      // Load saved outfits
      const outfits = JSON.parse(localStorage.getItem(`savedOutfits_${user.id}`) || '[]');
      setSavedOutfits(outfits.reverse()); // Show newest first

      // Load liked items
      const items = JSON.parse(localStorage.getItem(`likedItems_${user.id}`) || '[]');
      setLikedItems(items.reverse());
    };

    loadData();
  }, [user]);

  const handleDeleteOutfit = (outfitId: string) => {
    if (!confirm('Are you sure you want to delete this outfit?')) return;

    const updatedOutfits = savedOutfits.filter(o => o.id !== outfitId);
    setSavedOutfits(updatedOutfits);
    localStorage.setItem(`savedOutfits_${user?.id || 'guest'}`, JSON.stringify(updatedOutfits));
  };

  const handleUnlikeItem = (itemId: string) => {
    const updatedItems = likedItems.filter(item => item.id !== itemId);
    setLikedItems(updatedItems);
    localStorage.setItem(`likedItems_${user?.id || 'guest'}`, JSON.stringify(updatedItems));
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="text-center">
          <Heart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Sign in Required</h2>
          <p className="text-white/60 mb-6">Please sign in to access your outfit builder</p>
          <Link
            to="/auth"
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 bg-black/90 backdrop-blur-md border-b border-white/10 z-10">
        <div className="flex items-center justify-between p-4">
          <Link
            to="/explore"
            className="flex items-center gap-2 text-white/80 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Explore
          </Link>

          <h1 className="text-xl font-semibold">Outfit Builder</h1>

          <Link
            to="/explore"
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700"
          >
            <Plus className="w-4 h-4" />
            Browse Looks
          </Link>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setActiveTab('outfits')}
          className={`flex-1 px-6 py-3 font-medium transition-colors ${
            activeTab === 'outfits'
              ? 'text-white border-b-2 border-purple-500'
              : 'text-white/60 hover:text-white/80'
          }`}
        >
          Saved Outfits ({savedOutfits.length})
        </button>
        <button
          onClick={() => setActiveTab('items')}
          className={`flex-1 px-6 py-3 font-medium transition-colors ${
            activeTab === 'items'
              ? 'text-white border-b-2 border-purple-500'
              : 'text-white/60 hover:text-white/80'
          }`}
        >
          Liked Items ({likedItems.length})
        </button>
      </div>

      {/* Content */}
      <main className="p-6">
        {activeTab === 'outfits' ? (
          <div>
            {savedOutfits.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-10 h-10 text-white/40" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No saved outfits yet</h3>
                <p className="text-white/60 mb-6">
                  Start browsing looks and save items you like to build your first outfit
                </p>
                <Link
                  to="/explore"
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Browse Looks
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedOutfits.map((outfit) => (
                  <div
                    key={outfit.id}
                    className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-purple-500/50 transition-all"
                  >
                    {/* Outfit Preview */}
                    <div className="relative h-48 bg-white/5 p-4">
                      <div className="relative w-full h-full">
                        {outfit.items.slice(0, 4).map((item, index) => (
                          <div
                            key={item.id}
                            className="absolute"
                            style={{
                              left: `${20 + (index % 2) * 35}%`,
                              top: `${20 + Math.floor(index / 2) * 35}%`,
                            }}
                          >
                            <img
                              src={item.imageUrl}
                              alt={item.itemName}
                              className="w-20 h-20 object-cover rounded-lg border-2 border-white/20"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Outfit Info */}
                    <div className="p-4">
                      <h3 className="font-semibold text-lg mb-1">{outfit.name}</h3>
                      <p className="text-white/60 text-sm mb-3">
                        {outfit.items.length} items • {new Date(outfit.createdAt).toLocaleDateString()}
                      </p>

                      {/* Item Tags */}
                      <div className="flex flex-wrap gap-1 mb-4">
                        {Array.from(new Set(outfit.items.map(i => i.category))).map(category => (
                          <span
                            key={category}
                            className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full"
                          >
                            {category}
                          </span>
                        ))}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button className="flex-1 px-3 py-2 border border-white/20 text-white rounded-lg hover:bg-white/10 text-sm">
                          <Edit2 className="w-4 h-4 inline mr-1" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteOutfit(outfit.id)}
                          className="px-3 py-2 text-red-400 hover:text-red-300 text-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            {likedItems.length === 0 ? (
              <div className="text-center py-12">
                <Heart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No liked items yet</h3>
                <p className="text-white/60">
                  Click the heart icon on items you like while browsing looks
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {likedItems.map((item) => (
                  <div
                    key={item.id}
                    className="relative group bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-purple-500/50 transition-all"
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.itemName}
                      className="w-full aspect-square object-cover"
                    />

                    {/* Item Info */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80">
                      <p className="text-sm font-medium truncate">{item.itemName}</p>
                      <p className="text-xs text-white/60">
                        From {item.lookId.substring(0, 8)}...
                      </p>
                    </div>

                    {/* Unlike Button */}
                    <button
                      onClick={() => handleUnlikeItem(item.id)}
                      className="absolute top-3 right-3 w-8 h-8 bg-red-500/80 backdrop-blur-sm text-white rounded-full opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default OutfitBuilderPage;