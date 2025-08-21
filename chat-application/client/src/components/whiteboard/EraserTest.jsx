import React, { useState } from 'react';
import WhiteboardModal from './WhiteboardModal';

const EraserTest = () => {
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 text-center">
        Eraser Tool Test
      </h1>
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          ✅ Eraser Features Implemented
        </h2>
        <div className="space-y-3 text-gray-700 dark:text-gray-300">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Adjustable eraser size (5px - 100px)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Eraser only clears content where cursor moves</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Uses clearRect(x - size/2, y - size/2, size, size)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Dynamic cursor shows actual eraser size</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Other drawing tools unaffected when switching</span>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800 mb-6">
        <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100 mb-4">
          🧪 Testing Instructions
        </h2>
        <ol className="space-y-2 text-blue-800 dark:text-blue-200">
          <li>1. Click "Open Whiteboard" to start</li>
          <li>2. Draw something with the pen tool</li>
          <li>3. Switch to eraser tool (eraser icon)</li>
          <li>4. Adjust eraser size using the slider</li>
          <li>5. Erase parts of your drawing</li>
          <li>6. Notice the cursor shows the eraser size</li>
          <li>7. Switch back to pen tool - brush size is preserved</li>
        </ol>
      </div>

      <div className="text-center">
        <button
          onClick={() => setIsWhiteboardOpen(true)}
          className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl"
        >
          🧽 Open Whiteboard & Test Eraser
        </button>
      </div>

      <WhiteboardModal
        isOpen={isWhiteboardOpen}
        onClose={() => setIsWhiteboardOpen(false)}
        chatId="eraser-test-123"
        chatType="test"
        chatName="Eraser Test"
      />
    </div>
  );
};

export default EraserTest;
