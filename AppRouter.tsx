import React, { useState } from 'react';
import SimpleApp from './SimpleApp';
import StyleApp from './App';

const AppRouter: React.FC = () => {
  const [currentView, setCurrentView] = useState<'home' | 'app'>('app');

  if (currentView === 'home') {
    return <SimpleApp onNavigateToApp={() => setCurrentView('app')} />;
  } else {
    return (
      <div style={{ minHeight: '100vh' }}>
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          zIndex: 1000
        }}>
          <button
            onClick={() => setCurrentView('home')}
            style={{
              padding: '8px 16px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
             Back to Home
          </button>
        </div>
        <StyleApp />
      </div>
    );
  }
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
