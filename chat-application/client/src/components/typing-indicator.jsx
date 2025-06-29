import React from 'react';

const TypingIndicator = ({ isTyping, userName }) => {
  if (!isTyping) return null;

  return (
    <div className="flex items-center gap-2 p-3 text-gray-400 text-sm">
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
      </div>
      <span>{userName} is typing...</span>
    </div>
  );
};

export default TypingIndicator; 