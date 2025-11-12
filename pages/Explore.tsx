import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, RefreshCw, Loader2, Sparkles } from 'lucide-react';
import type { ExploreLook } from '../types/explore';
import { ExploreService } from '../services/exploreService';
import { useAuth } from '../contexts/AuthContext';

const ExplorePage: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id ?? 'guest';
  const navigate = useNavigate();
  const [gender, setGender] = useState<'male' | 'female'>(ExploreService.getLatestUserGender());
  const [likes, setLikes] = useState(ExploreService.getLikes());
  const [looks, setLooks] = useState<ExploreLook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRemixing, setIsRemixing] = useState(false);
  const [remixResult, setRemixResult] = useState<{ imageUrl?: string; name?: string } | null>(null);
  const [remixError, setRemixError] = useState<string | null>(null);
  const [userPhoto, setUserPhoto] = useState<string | null>(() => ExploreService.getLatestUserPhoto(userId));
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [pendingLook, setPendingLook] = useState<ExploreLook | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);

    ExploreService.getLooks(gender)
      .then((dataset) => {
        if (!cancelled) {
          setLooks(dataset);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error(error);
          setLoadError('Unable to load explore looks right now.');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [gender]);

  useEffect(() => {
    setUserPhoto(ExploreService.getLatestUserPhoto(userId));
  }, [userId]);

  const handleLike = (look: ExploreLook) => {
    setLikes(ExploreService.likeLook(look));
  };

  const executeRemix = async (look: ExploreLook, photo?: string) => {
    if (!photo) {
      setRemixError('Upload your own photo first to remix outfits.');
      setRemixResult(null);
      return;
    }
    setIsRemixing(true);
    setRemixError(null);
    setRemixResult(null);

    try {
      const remix = await ExploreService.remixLook(photo, look);
      if (remix.styledPhotoUrl) {
        ExploreService.saveRemix(userId, {
          lookId: look.id,
          lookName: look.title,
          imageUrl: remix.styledPhotoUrl
        });
      }
      setRemixResult({ imageUrl: remix.styledPhotoUrl, name: look.title });
    } catch (error) {
      console.error(error);
      setRemixError(error instanceof Error ? error.message : 'Failed to remix look');
    } finally {
      setIsRemixing(false);
    }
  };

  const handleRemix = (look: ExploreLook) => {
    if (!userPhoto) {
      setPendingLook(look);
      setIsPhotoModalOpen(true);
      return;
    }
    executeRemix(look, userPhoto);
  };

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please upload an image file.');
      return;
    }

    const toDataUrl = (f: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(f);
      });

    try {
      const dataUrl = await toDataUrl(file);
      setUploadPreview(dataUrl);
    } catch {
      setUploadError('Failed to read image. Try another file.');
    }
  };

  const handlePhotoSave = async () => {
    if (!uploadPreview) {
      setUploadError('Select a photo first.');
      return;
    }
    ExploreService.setLatestUserPhoto(userId, uploadPreview);
    setUserPhoto(uploadPreview);
    setIsPhotoModalOpen(false);
    const lookToRemix = pendingLook;
    setPendingLook(null);
    setUploadPreview(null);
    if (lookToRemix) {
      executeRemix(lookToRemix, uploadPreview);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex">
      <aside className="hidden md:flex flex-col w-72 border-r border-white/10 p-8 gap-8">
        <div>
          <p className="text-sm uppercase tracking-[0.4em] text-white/50">Wardrobe AI</p>
          <h1 className="text-3xl font-bold mt-2">Explore</h1>
        </div>

        <nav className="flex flex-col gap-4 text-white/70">
          <button className="text-left hover:text-white transition">Explore feed</button>
          <button className="text-left hover:text-white transition">Looks you liked ({Object.values(likes).filter(Boolean).length})</button>
          <button className="text-left hover:text-white transition" onClick={() => navigate('/remixes')}>
            Your remixes
          </button>
          <button className="text-left hover:text-white transition" onClick={() => navigate('/explore-admin')}>
            Manage explore looks
          </button>
        </nav>

        <div className="space-y-3">
          <p className="text-xs uppercase tracking-widest text-white/40">Filter by</p>
          <div className="flex gap-3">
            {(['female', 'male'] as const).map(option => (
              <button
                key={option}
                onClick={() => setGender(option)}
                className={`flex-1 px-3 py-2 rounded-full border text-sm ${
                  gender === option ? 'border-white text-white' : 'border-white/20 text-white/60 hover:text-white'
                }`}
              >
                {option === 'female' ? 'Women' : 'Men'}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto text-sm text-white/60 space-y-2">
          <p>Tip: Click "Remix" to apply the outfit to your latest photo.</p>
          <button
            onClick={() => navigate('/explore-admin')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 text-white/70 hover:text-white"
          >
            <Sparkles className="w-4 h-4" />
            Generate more looks
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
        {!userPhoto && (
          <div className="mb-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 text-yellow-100 p-4 text-sm">
            Upload a photo in the personal styling flow to unlock remixing.
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-white/60">
            <Loader2 className="w-10 h-10 animate-spin" />
            <p>Loading looks...</p>
          </div>
        ) : loadError ? (
          <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
            {loadError}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {looks.map((look) => (
              <article
                key={look.id}
                className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-xl group h-full flex flex-col"
              >
                <div className="relative">
                  <img
                    src={look.imageUrl}
                    alt={look.title}
                    className="w-full object-cover"
                    style={{ aspectRatio: '9 / 16' }}
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition" />
                  <div className="absolute bottom-3 left-3 right-3 text-sm">
                    <p className="font-semibold">{look.title}</p>
                    <p className="text-white/70 text-xs">{look.description}</p>
                  </div>
                </div>
                <div className="p-3 flex items-center justify-between text-sm border-t border-white/10 mt-auto">
                  <button
                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${
                      likes[look.id] ? 'bg-green-500 text-white' : 'bg-white text-black'
                    }`}
                    onClick={() => handleLike(look)}
                  >
                    <Heart className="w-4 h-4" />
                    {likes[look.id] ? 'Saved' : 'Like'}
                  </button>
                  <button
                    onClick={() => handleRemix(look)}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/30 text-white/80 hover:text-white"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Remix
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {(isRemixing || remixResult || remixError) && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-gray-900">
            {isRemixing && (
              <div className="flex flex-col items-center gap-4 py-8">
                <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
                <p className="text-gray-600 text-sm text-center">Remixing look with your photo...</p>
              </div>
            )}

            {!isRemixing && remixResult && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-center">{remixResult.name}</h3>
                {remixResult.imageUrl ? (
                  <img src={remixResult.imageUrl} alt={remixResult.name} className="w-full rounded-2xl" />
                ) : (
                  <p className="text-center text-gray-500">No image returned.</p>
                )}
                <button
                  onClick={() => setRemixResult(null)}
                  className="w-full rounded-2xl bg-purple-600 text-white py-3 font-semibold"
                >
                  Close
                </button>
              </div>
            )}

            {!isRemixing && remixError && (
              <div className="space-y-4 text-center">
                <p className="text-red-500">{remixError}</p>
                <button
                  onClick={() => setRemixError(null)}
                  className="px-4 py-2 rounded-xl bg-gray-900 text-white"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {isPhotoModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-gray-900 space-y-4">
            <h3 className="text-xl font-semibold">Upload your photo</h3>
            <p className="text-sm text-gray-600">
              We use this photo privately to render outfits on you. Files never leave this device except for the AI edit.
            </p>
            <label className="block border border-dashed border-gray-300 rounded-2xl p-4 text-center cursor-pointer hover:border-gray-400">
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              {uploadPreview ? (
                <img src={uploadPreview} alt="Preview" className="w-full rounded-2xl" />
              ) : (
                <span className="text-gray-500">Click to select an image</span>
              )}
            </label>
            {uploadError && <p className="text-sm text-red-500">{uploadError}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsPhotoModalOpen(false);
                  setPendingLook(null);
                  setUploadPreview(null);
                  setUploadError(null);
                }}
                className="flex-1 rounded-2xl border border-gray-300 py-2"
              >
                Cancel
              </button>
              <button
                onClick={handlePhotoSave}
                className="flex-1 rounded-2xl bg-black text-white py-2"
              >
                Save & continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExplorePage;
