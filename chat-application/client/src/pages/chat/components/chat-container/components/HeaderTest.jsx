import React, { useState } from 'react';
import { useAppStore } from '@/store';
import ChatContainer from '../index';

const HeaderTest = () => {
  const { setSelectedChatData, setSelectedChatType } = useAppStore();
  const [currentType, setCurrentType] = useState('contact');

  const mockChannelData = {
    _id: 'channel-123',
    name: 'Test Channel',
    description: 'This is a test channel for demonstrating the header functionality',
    profilePicture: null,
    adminId: 'user-1',
    members: [
      { _id: 'user-1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
      { _id: 'user-2', firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' }
    ],
    createdAt: new Date().toISOString()
  };

  const mockUserData = {
    _id: 'user-123',
    firstName: 'Alice',
    lastName: 'Johnson',
    email: 'alice@example.com',
    bio: 'Software developer and coffee enthusiast',
    profilePicture: null,
    lastSeen: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
    createdAt: new Date().toISOString()
  };

  const switchToChannel = () => {
    setSelectedChatData(mockChannelData);
    setSelectedChatType('channel');
    setCurrentType('channel');
  };

  const switchToUser = () => {
    setSelectedChatData(mockUserData);
    setSelectedChatType('contact');
    setCurrentType('contact');
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Test Controls */}
      <div className="fixed top-4 left-4 z-50 bg-gray-800 p-4 rounded-lg shadow-lg">
        <h3 className="text-white font-semibold mb-3">Header Test Controls</h3>
        <div className="space-y-2">
          <button
            onClick={switchToChannel}
            className={`w-full px-3 py-2 rounded text-sm font-medium transition-colors ${
              currentType === 'channel' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Switch to Channel
          </button>
          <button
            onClick={switchToUser}
            className={`w-full px-3 py-2 rounded text-sm font-medium transition-colors ${
              currentType === 'contact' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Switch to User
          </button>
        </div>
        
        <div className="mt-4 p-3 bg-gray-700 rounded text-xs text-gray-300">
          <p><strong>Current:</strong> {currentType}</p>
          <p><strong>Action:</strong> Click the header to test</p>
        </div>
      </div>

      {/* Chat Container */}
      <ChatContainer />
    </div>
  );
};

export default HeaderTest;
