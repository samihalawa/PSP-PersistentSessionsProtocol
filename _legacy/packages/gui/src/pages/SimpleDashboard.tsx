import React from 'react';

const Dashboard: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">PSP Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Active Sessions</h3>
          <p className="text-3xl font-bold text-blue-600">3</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Total Sessions</h3>
          <p className="text-3xl font-bold text-green-600">12</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Platforms</h3>
          <p className="text-3xl font-bold text-purple-600">20+</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Sessions</h2>
        <div className="space-y-3">
          {[
            { name: 'Gmail Production', status: 'active', platform: 'Gmail' },
            { name: 'GitHub Development', status: 'active', platform: 'GitHub' },
            { name: 'AWS Console Admin', status: 'inactive', platform: 'AWS' }
          ].map((session, index) => (
            <div key={index} className="flex items-center justify-between p-3 border rounded">
              <div>
                <h4 className="font-medium">{session.name}</h4>
                <p className="text-sm text-gray-600">{session.platform}</p>
              </div>
              <span className={`px-2 py-1 rounded text-sm ${
                session.status === 'active' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {session.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;