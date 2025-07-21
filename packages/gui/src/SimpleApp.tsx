import React from 'react';
import SimpleDashboard from './pages/SimpleDashboard';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">PSP - Persistent Sessions Protocol</h1>
            </div>
            <nav className="flex space-x-4">
              <a href="#" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                Dashboard
              </a>
              <a href="#" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                Sessions
              </a>
              <a href="#" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                Settings
              </a>
            </nav>
          </div>
        </div>
      </header>
      
      <main>
        <SimpleDashboard />
      </main>
    </div>
  );
};

export default App;