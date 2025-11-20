import React, { useEffect, useState } from 'react';
import SimpleApp from './SimpleApp';
import StyleApp from './App';
import FalGridTestPage from './pages/FalGridTestPage';

const navButtonStyle: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: '8px',
  border: 'none',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 600,
};

type View = 'home' | 'app' | 'falTest';

const getViewFromPath = (): View => {
  if (typeof window === 'undefined') return 'app';
  const path = window.location.pathname;
  if (path === '/fal-grid-test') return 'falTest';
  if (path === '/' || path === '/home') return 'home';
  return 'app';
};

const getPathForView = (view: View): string => {
  switch (view) {
    case 'home':
      return '/home';
    case 'falTest':
      return '/fal-grid-test';
    default:
      return '/app';
  }
};

const AppRouter: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(() => getViewFromPath());

  useEffect(() => {
    const handlePopState = () => setCurrentView(getViewFromPath());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (view: View) => {
    const nextPath = getPathForView(view);
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
    setCurrentView(view);
  };

  const NavBar = () => (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        zIndex: 1000,
        display: 'flex',
        gap: '8px',
        background: 'rgba(255,255,255,0.9)',
        padding: '10px',
        borderRadius: '999px',
        boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
      }}
    >
      <button
        onClick={() => navigate('home')}
        style={{
          ...navButtonStyle,
          backgroundColor: currentView === 'home' ? '#3b82f6' : '#eef2ff',
          color: currentView === 'home' ? '#fff' : '#1f2937',
        }}
      >
        Home
      </button>
      <button
        onClick={() => navigate('app')}
        style={{
          ...navButtonStyle,
          backgroundColor: currentView === 'app' ? '#10b981' : '#dcfce7',
          color: currentView === 'app' ? '#fff' : '#1f2937',
        }}
      >
        Style App
      </button>
      <button
        onClick={() => navigate('falTest')}
        style={{
          ...navButtonStyle,
          backgroundColor: currentView === 'falTest' ? '#f59e0b' : '#fef3c7',
          color: '#1f2937',
        }}
      >
        fal Grid Test
      </button>
    </div>
  );

  let view: React.ReactNode;
  if (currentView === 'home') {
    view = <SimpleApp onNavigateToApp={() => navigate('app')} />;
  } else if (currentView === 'falTest') {
    view = <FalGridTestPage onBack={() => navigate('home')} />;
  } else {
    view = <StyleApp />;
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <NavBar />
      {view}
    </div>
  );
};

// Simple feature page
const FeaturesPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-20">
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Features</h1>
        <div className="space-y-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-semibold mb-4">AI-Powered Style Learning</h2>
            <p className="text-gray-600">
              Our advanced AI learns from your preferences with every interaction,
              providing increasingly accurate outfit recommendations.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-semibold mb-4">Realistic Visualizations</h2>
            <p className="text-gray-600">
              See how outfits look on you with photorealistic AI-generated images
              that maintain your appearance and fit.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-semibold mb-4">Cloud Sync & Offline Support</h2>
            <p className="text-gray-600">
              Your style profile syncs across devices and works offline,
              automatically updating when you're back online.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Privacy policy page
const PrivacyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-20">
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
        <div className="bg-white p-8 rounded-lg shadow space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-3">Data Collection</h2>
            <p className="text-gray-600">
              We collect style preferences and feedback to provide personalized recommendations.
              All data is stored securely and used only to improve your experience.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-semibold mb-3">Image Processing</h2>
            <p className="text-gray-600">
              Your photos are processed securely and are not shared with third parties.
              Generated images are stored only for your personal use.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-semibold mb-3">Data Security</h2>
            <p className="text-gray-600">
              We use industry-standard encryption and security measures to protect your data.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

// Terms of service page
const TermsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-20">
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Terms of Service</h1>
        <div className="bg-white p-8 rounded-lg shadow space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-3">Service Description</h2>
            <p className="text-gray-600">
              StyleAI provides AI-powered fashion recommendations based on user preferences and feedback.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-semibold mb-3">User Responsibilities</h2>
            <p className="text-gray-600">
              Users are responsible for providing accurate feedback and using the service ethically.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-semibold mb-3">Limitations</h2>
            <p className="text-gray-600">
              Our AI recommendations are suggestions and should be used as guidance for fashion choices.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AppRouter;
