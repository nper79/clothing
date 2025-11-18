import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const CreditsPage: React.FC = () => {
  const { user, credits, creditPacks, purchaseCredits, refreshCredits } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [loadingPack, setLoadingPack] = useState<string | null>(null);

  useEffect(() => {
    refreshCredits();
  }, [refreshCredits]);

  const handlePurchase = async (packId: string) => {
    setStatus(null);
    setLoadingPack(packId);
    try {
      await purchaseCredits(packId);
      setStatus({ type: 'success', message: 'Credits added to your account.' });
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to purchase credits',
      });
    } finally {
      setLoadingPack(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white px-6 py-10">
      <header className="max-w-5xl mx-auto flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.5em] text-white/40">Wardrobe AI</p>
          <h1 className="text-3xl font-semibold mt-2">Credit balance</h1>
          <p className="text-white/60">
            Use credits for personalized look generation and remixes. Each action consumes credits automatically.
          </p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 rounded-full border border-white/30 text-sm text-white/80 hover:text-white"
        >
          Back
        </button>
      </header>

      <main className="max-w-5xl mx-auto mt-10 space-y-8">
        <section className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-white/50">Available credits</p>
            <p className="text-5xl font-semibold mt-2">{credits ?? 0}</p>
            {user && (
              <p className="text-sm text-white/60 mt-2">
                Account: <span className="text-white/80">{user.email || user.id}</span>
              </p>
            )}
          </div>
          <div className="text-sm text-white/60">
            <p>• Personal look generation consumes multiple credits depending on the bundle requested.</p>
            <p>• Each remix on the explore feed uses a single credit.</p>
            <button
              onClick={refreshCredits}
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 hover:border-white/40"
            >
              Refresh balance
            </button>
          </div>
        </section>

        {status && (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              status.type === 'success'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
                : 'border-red-500/40 bg-red-500/10 text-red-100'
            }`}
          >
            {status.message}
          </div>
        )}

        <section className="grid gap-6 md:grid-cols-3">
          {creditPacks.map((pack) => (
            <article
              key={pack.id}
              className={`rounded-3xl border p-6 bg-white/5 border-white/10 flex flex-col ${
                pack.bestValue ? 'ring-2 ring-amber-400/60' : ''
              }`}
            >
              {pack.bestValue && (
                <span className="text-xs uppercase tracking-[0.3em] text-amber-300 mb-2">Best value</span>
              )}
              <h3 className="text-2xl font-semibold">{pack.label}</h3>
              <p className="text-white/60 text-sm mt-2 flex-1">{pack.description}</p>
              <p className="text-4xl font-bold mt-6">{pack.credits}</p>
              <p className="text-white/60 text-sm">credits</p>
              <p className="text-white/70 text-lg mt-4">
                ${(pack.priceCents / 100).toFixed(2)} USD
              </p>
              <button
                onClick={() => handlePurchase(pack.id)}
                disabled={loadingPack === pack.id}
                className="mt-6 rounded-2xl bg-white text-black font-semibold py-3 hover:bg-white/90 transition disabled:opacity-50"
              >
                {loadingPack === pack.id ? 'Processing...' : 'Buy credits'}
              </button>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
};

export default CreditsPage;
