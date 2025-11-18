import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const HomePage: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handlePrimaryAction = async () => {
    if (user) {
      navigate('/explore');
      return;
    }
    navigate('/auth');
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-black text-white">
      <header className="max-w-6xl mx-auto px-6 py-10 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.5em] text-white/50">Wardrobe AI</p>
          <h1 className="text-3xl font-semibold mt-1">Personalized Style, Visualized</h1>
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <button
              onClick={handleSignOut}
              className="px-4 py-2 rounded-full border border-white/20 text-sm text-white/70 hover:text-white"
            >
              Sign out
            </button>
          )}
          <button
            onClick={handlePrimaryAction}
            className="px-5 py-2.5 rounded-full bg-white text-black font-semibold hover:bg-white/90 transition"
          >
            {user ? 'Open Explore' : 'Sign in to start'}
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16 grid lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <h2 className="text-4xl lg:text-5xl font-bold leading-tight">
            Upload your photo, let AI craft full looks you can remix instantly.
          </h2>
          <p className="text-white/70 text-lg">
            Our GPT-5-powered stylist plans outfits, Nano Banana renders photoreal images, and your feedback keeps teaching the wardrobe graph.
          </p>
          <ul className="space-y-4 text-white/80">
            <li>• Explore curated looks per gender.</li>
            <li>• Remix any outfit on your photo in seconds.</li>
            <li>• Save liked looks and build your gallery of remixes.</li>
          </ul>
          <div className="flex flex-wrap gap-4 pt-4">
            <button
              onClick={() => navigate('/style-quiz')}
              className="px-6 py-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:from-purple-600 hover:to-pink-600 transition"
            >
              Take Style Quiz
            </button>
            <button
              onClick={handlePrimaryAction}
              className="px-6 py-3 rounded-full bg-blue-500 text-white font-semibold hover:bg-blue-400 transition"
            >
              {user ? 'Continue to Explore' : 'Sign in & Explore'}
            </button>
            <button
              onClick={() => navigate('/explore')}
              className="px-6 py-3 rounded-full border border-white/30 text-white/80 hover:text-white hover:border-white/60 transition"
            >
              Browse feed
            </button>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="rounded-2xl bg-gradient-to-b from-purple-500/50 to-purple-800/20 p-4">
                <p className="text-sm uppercase tracking-[0.4em] text-white/70">Step 1</p>
                <h3 className="text-xl font-semibold mt-2">Upload photo</h3>
                <p className="text-white/70 text-sm mt-1">Secure, private, ready for AI edits.</p>
              </div>
              <div className="rounded-2xl bg-gradient-to-b from-blue-500/50 to-blue-800/20 p-4">
                <p className="text-sm uppercase tracking-[0.4em] text-white/70">Step 2</p>
                <h3 className="text-xl font-semibold mt-2">Pick a vibe</h3>
                <p className="text-white/70 text-sm mt-1">Street, minimal, smart casual, or glam.</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl bg-gradient-to-b from-emerald-500/50 to-emerald-800/20 p-4">
                <p className="text-sm uppercase tracking-[0.4em] text-white/70">Step 3</p>
                <h3 className="text-xl font-semibold mt-2">Remix instantly</h3>
                <p className="text-white/70 text-sm mt-1">See the outfit on you in full 9:16.</p>
              </div>
              <div className="rounded-2xl bg-gradient-to-b from-orange-500/50 to-orange-800/20 p-4">
                <p className="text-sm uppercase tracking-[0.4em] text-white/70">Step 4</p>
                <h3 className="text-xl font-semibold mt-2">Save remixes</h3>
                <p className="text-white/70 text-sm mt-1">Build your personalized lookbook.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;
