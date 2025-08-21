import React, { useState } from 'react';
import { useAppStore } from '@/store';
import { Palette } from 'lucide-react';
import WhiteboardModal from './WhiteboardModal';

const WhiteboardButton = ({ chatId, chatType, chatName }) => {
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
  const { selectedChatData } = useAppStore();

  const handleOpenWhiteboard = (e) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent triggering any parent click handlers
    setIsWhiteboardOpen(true);
  };

  const handleCloseWhiteboard = () => {
    setIsWhiteboardOpen(false);
  };

  // Don't show whiteboard button if no chat is selected
  if (!chatId || !selectedChatData) {
    return null;
  }

  return (
    <>
      <button
        onClick={handleOpenWhiteboard}
        className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-700 rounded-md transition-colors duration-200"
        title="Open mini whiteboard"
        type="button"
      >
        <Palette className="w-5 h-5" />
      </button>

      <WhiteboardModal
        isOpen={isWhiteboardOpen}
        onClose={handleCloseWhiteboard}
        chatId={chatId}
        chatType={chatType}
        chatName={chatName}
      />
    </>
  );
};

export default WhiteboardButton;
