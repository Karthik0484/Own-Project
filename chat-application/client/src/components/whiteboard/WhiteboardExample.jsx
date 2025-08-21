import React, { useState } from 'react';
import WhiteboardModal from './WhiteboardModal';

const WhiteboardExample = () => {
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
        Whiteboard Functionality Demo
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            🎨 Drawing Tools
          </h2>
          <ul className="space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>Pen Tool:</strong> Freehand drawing with customizable color and size</li>
            <li><strong>Eraser Tool:</strong> Erase drawn strokes with precision</li>
            <li><strong>Rectangle Tool:</strong> Draw rectangles (hold Shift for perfect squares)</li>
            <li><strong>Circle Tool:</strong> Draw circles (hold Shift for perfect circles)</li>
            <li><strong>Text Tool:</strong> Add text with customizable font size and color</li>
          </ul>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            🔧 Actions & Features
          </h2>
          <ul className="space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>Undo/Redo:</strong> Full undo/redo stack for all actions</li>
            <li><strong>Clear Canvas:</strong> Clear entire whiteboard</li>
            <li><strong>Export:</strong> Download canvas as PNG image</li>
            <li><strong>Save Snapshot:</strong> Save to chat history</li>
            <li><strong>Voice Chat:</strong> Integrated voice communication</li>
          </ul>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800 mb-8">
        <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100 mb-4">
          💡 Usage Tips
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-blue-800 dark:text-blue-200">
          <div>
            <h3 className="font-semibold mb-2">Keyboard Shortcuts:</h3>
            <ul className="space-y-1 text-sm">
              <li>• Hold <kbd className="px-2 py-1 bg-blue-200 dark:bg-blue-800 rounded text-xs">Shift</kbd> for perfect shapes</li>
              <li>• <kbd className="px-2 py-1 bg-blue-200 dark:bg-blue-800 rounded text-xs">Enter</kbd> to confirm text input</li>
              <li>• <kbd className="px-2 py-1 bg-blue-200 dark:bg-blue-800 rounded text-xs">Escape</kbd> to cancel text input</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Responsive Design:</h3>
            <ul className="space-y-1 text-sm">
              <li>• Works on desktop, tablet, and mobile</li>
              <li>• Touch-friendly interface</li>
              <li>• Adaptive toolbar layout</li>
              <li>• Dark mode support</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={() => setIsWhiteboardOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
        >
          🎨 Open Whiteboard Demo
        </button>
      </div>

      <WhiteboardModal
        isOpen={isWhiteboardOpen}
        onClose={() => setIsWhiteboardOpen(false)}
        chatId="demo-chat-123"
        chatType="demo"
        chatName="Whiteboard Demo"
      />
    </div>
  );
};

export default WhiteboardExample;
