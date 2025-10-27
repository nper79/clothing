import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { isFirebaseConfigured } from '../services/firebaseConfig';

const LandingPage: React.FC = () => {
  const { signInWithGoogle, loading } = useAuth();
  const [firebaseStatus, setFirebaseStatus] = useState<'checking' | 'configured' | 'not-configured'>('checking');

  useEffect(() => {
    // Check Firebase configuration
    const configured = isFirebaseConfigured();
    setFirebaseStatus(configured ? 'configured' : 'not-configured');
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Sign in failed:', error);
      // You could show a toast or error message here
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Firebase Configuration Banner */}
      {firebaseStatus === 'not-configured' && (
        <div className="bg-yellow-50 border-b border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-yellow-600 dark:text-yellow-400">⚠️</span>
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  <strong>Demo Mode:</strong> Firebase not configured. Using mock authentication.
                  <a href="/FIREBASE_SETUP.md" className="ml-2 underline hover:text-yellow-600 dark:hover:text-yellow-400">
                    Setup instructions →
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="relative bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                StyleAI
              </span>
            </div>
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sign In</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="text-center">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight">
              <span className="block text-gray-900 dark:text-white">
                Your Personal
              </span>
              <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                AI Stylist
              </span>
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-lg sm:text-xl text-gray-600 dark:text-gray-300">
              Discover your perfect style with AI-powered personalized outfit recommendations.
              Upload your photo and get instant fashion suggestions tailored to you.
            </p>
            <div className="mt-10 sm:mt-12 flex justify-center">
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Signing in...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="white" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="white" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="white" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="white" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    {firebaseStatus === 'not-configured' ? 'Try Demo Mode' : 'Continue with Google'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              How It Works
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              Get personalized style recommendations in three simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-6">
                <span className="text-2xl">📸</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Upload Your Photo
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Take or upload a photo and let our AI analyze your style preferences
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mb-6">
                <span className="text-2xl">✨</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Get AI Suggestions
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Receive personalized outfit recommendations generated just for you
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-6">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Refine Your Style
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Like or dislike suggestions to help AI learn your unique taste
              </p>
            </div>
          </div>
        </div>

        {/* Testimonial */}
        <div className="bg-white dark:bg-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <div className="text-center">
              <blockquote className="text-2xl font-medium text-gray-900 dark:text-white">
                "Finally, an AI that understands my personal style! The recommendations are incredibly accurate."
              </blockquote>
              <div className="mt-8">
                <div className="mx-auto w-16 h-16 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                  <span className="text-xl">👤</span>
                </div>
                <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                  Sarah M., Fashion Enthusiast
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400">
              © 2024 StyleAI. All rights reserved.
            </p>
            <div className="mt-4 flex justify-center space-x-6">
              <a href="#" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                Privacy
              </a>
              <a href="#" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                Terms
              </a>
              <a href="#" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;