import React from 'react';

const UserDashboard: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          User Dashboard
        </h1>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">🎉 Dashboard Working!</h2>
          <p className="text-gray-600 mb-4">
            This is the user dashboard where style analytics will be displayed.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-900">Style Profile</h3>
              <p className="text-purple-700 text-sm">Your preferences</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900">Analytics</h3>
              <p className="text-blue-700 text-sm">Style insights</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-900">History</h3>
              <p className="text-green-700 text-sm">Past outfits</p>
            </div>
          </div>
          <button
            onClick={() => window.location.href = '/app'}
            className="mt-6 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Try New Styles
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;