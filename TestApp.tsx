import React from 'react';

const TestApp: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          StyleAI - Test Page
        </h1>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">✅ App is Working!</h2>
          <p className="text-gray-600 mb-4">
            If you can see this page, the React app is loading correctly.
          </p>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span>React Router: Installed</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span>Supabase: Configured</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span>Tailwind CSS: Working</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span>TypeScript: Compiled</span>
            </div>
          </div>
          <button className="mt-6 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            Test Button
          </button>
        </div>
      </div>
    </div>
  );
};

export default TestApp;