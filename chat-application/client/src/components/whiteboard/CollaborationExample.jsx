import React, { useState } from 'react';
import WhiteboardModal from './WhiteboardModal';

const CollaborationExample = () => {
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8 text-center">
        Real-Time Whiteboard Collaboration Demo
      </h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Feature Overview */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            🚀 Real-Time Features
          </h2>
          <div className="space-y-3 text-gray-700 dark:text-gray-300">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Instant drawing synchronization</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Live cursor position sharing</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Synchronized undo/redo</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Real-time participant management</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Admin controls and room locking</span>
            </div>
          </div>
        </div>

        {/* Technical Details */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            ⚡ Technical Highlights
          </h2>
          <div className="space-y-3 text-gray-700 dark:text-gray-300">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>WebSocket real-time communication</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>20ms throttled mouse events</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Canvas state synchronization</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Action history management</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Automatic room cleanup</span>
            </div>
          </div>
        </div>
      </div>

      {/* Testing Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800 mb-8">
        <h2 className="text-2xl font-semibold text-blue-900 dark:text-blue-100 mb-4">
          🧪 Testing Instructions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-blue-800 dark:text-blue-200">
          <div>
            <h3 className="font-semibold mb-3">Multi-User Testing:</h3>
            <ol className="space-y-2 text-sm">
              <li>1. Open this page in multiple browser tabs/windows</li>
              <li>2. Click "Start Collaboration" in each tab</li>
              <li>3. Draw simultaneously from different tabs</li>
              <li>4. Watch real-time synchronization</li>
              <li>5. Test undo/redo across all participants</li>
            </ol>
          </div>
          <div>
            <h3 className="font-semibold mb-3">Feature Testing:</h3>
            <ol className="space-y-2 text-sm">
              <li>• Try different drawing tools (pen, eraser, shapes)</li>
              <li>• Add text and see it sync across tabs</li>
              <li>• Use admin controls to lock/unlock</li>
              <li>• Watch cursor positions in real-time</li>
              <li>• Test on mobile and desktop</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg text-center">
          <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
            &lt; 50ms
          </div>
          <div className="text-gray-600 dark:text-gray-400">
            Event Latency
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg text-center">
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
            20ms
          </div>
          <div className="text-gray-600 dark:text-gray-400">
            Throttle Interval
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg text-center">
          <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">
            100
          </div>
          <div className="text-gray-600 dark:text-gray-400">
            Max Actions History
          </div>
        </div>
      </div>

      {/* Start Button */}
      <div className="text-center">
        <button
          onClick={() => setIsWhiteboardOpen(true)}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          🎨 Start Real-Time Collaboration
        </button>
        <p className="text-gray-600 dark:text-gray-400 mt-4 text-sm">
          Open multiple tabs to test real-time collaboration
        </p>
      </div>

      {/* Whiteboard Modal */}
      <WhiteboardModal
        isOpen={isWhiteboardOpen}
        onClose={() => setIsWhiteboardOpen(false)}
        chatId="collaboration-demo-123"
        chatType="demo"
        chatName="Collaboration Demo"
      />
    </div>
  );
};

export default CollaborationExample;

