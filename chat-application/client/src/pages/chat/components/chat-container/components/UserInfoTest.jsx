import React, { useState } from 'react';
import { useAppStore } from '@/store';
import ChatContainer from '../index';

const UserInfoTest = () => {
  const { setSelectedChatData, setSelectedChatType } = useAppStore();
  const [isUserInfoOpen, setIsUserInfoOpen] = useState(false);

  const mockUserData = {
    _id: 'user-123',
    firstName: 'Alice',
    lastName: 'Johnson',
    email: 'alice@example.com',
    bio: 'Software developer and coffee enthusiast. Working on exciting projects and always learning new technologies! 🚀',
    profilePicture: null,
    lastSeen: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
    createdAt: new Date('2023-08-15').toISOString(),
    customStatus: 'Working on project 🚀',
    phone: '+1 (555) 123-4567'
  };

  const openUserInfo = () => {
    setSelectedChatData(mockUserData);
    setSelectedChatType('contact');
    setIsUserInfoOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Test Controls */}
      <div className="fixed top-4 left-4 z-50 bg-gray-800 p-6 rounded-lg shadow-lg max-w-md">
        <h3 className="text-white font-semibold mb-4 text-lg">Enhanced UserInfoDrawer Test</h3>
        
        <div className="space-y-4">
          <div className="bg-gray-700 p-4 rounded-lg">
            <h4 className="text-purple-400 font-medium mb-2">✅ Features Implemented</h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Mutual Groups/Channels (with clickable items)</li>
              <li>• Shared Media & Files (Images, Files, Links)</li>
              <li>• Member Since (formatted join date)</li>
              <li>• Mute Notifications Toggle</li>
              <li>• Custom Status / Activity</li>
              <li>• Responsive Design (Desktop, Tablet, Mobile)</li>
            </ul>
          </div>

          <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-800">
            <h4 className="text-blue-400 font-medium mb-2">🧪 Testing Instructions</h4>
            <ol className="text-blue-200 text-sm space-y-1">
              <li>1. Click "Open User Info" to start</li>
              <li>2. Test all 3 tabs: Profile, Media, Mutual</li>
              <li>3. Try the mute notifications toggle</li>
              <li>4. Click on mutual channels to switch</li>
              <li>5. Test media preview and download</li>
              <li>6. Check responsive design on different screen sizes</li>
            </ol>
          </div>

          <button
            onClick={openUserInfo}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            👤 Open Enhanced User Info
          </button>
        </div>

        <div className="mt-4 p-3 bg-gray-700 rounded text-xs text-gray-300">
          <p><strong>Current:</strong> User Info Drawer</p>
          <p><strong>Action:</strong> Click the header to test</p>
        </div>
      </div>

      {/* Chat Container */}
      <ChatContainer />
    </div>
  );
};

export default UserInfoTest;
