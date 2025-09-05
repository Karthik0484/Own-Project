import ChatHeader from "./components/chat-header";
import ChannelInfoDrawer from "./components/channel-info-drawer";
import UserInfoDrawer from "./components/user-info-drawer";
import MessageBar from "./components/message-bar";
import MessageContainer from "./components/message-container";
import UniverseSelector from "@/components/UniverseSelector";
import { useAppStore } from "@/store";
import { useState } from "react";

const ChatContainer = () => {
  const { selectedChatType, selectedChatData } = useAppStore();
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedUniverseId, setSelectedUniverseId] = useState(null);
  
  const openDrawer = () => setShowDrawer(true);
  const closeDrawer = () => setShowDrawer(false);
  
  // Determine which drawer to show based on conversation type
  const isChannel = selectedChatType === 'channel';
  const isDM = selectedChatType === 'contact';
  
  return ( 
    <div className="fixed top-0 h-[100vh] w-[100vw] bg-[#1c1d25] flex flex-col md:static md:flex-1" onClick={() => showDrawer && setShowDrawer(false)}>
      <div onClick={(e) => e.stopPropagation()}>
        <ChatHeader onHeaderClick={openDrawer} />
      </div>
      
      {/* Show Universe Selector only for DMs */}
      {isDM && selectedChatData?._id && (
        <UniverseSelector 
          dmId={selectedChatData._id} 
          onUniverseChange={setSelectedUniverseId}
        />
      )}
      
      <MessageContainer selectedUniverseId={selectedUniverseId} />
      <MessageBar selectedUniverseId={selectedUniverseId} />
      
      {/* Conditionally render the appropriate drawer */}
      {isChannel ? (
        <ChannelInfoDrawer open={showDrawer} onClose={closeDrawer} />
      ) : (
        <UserInfoDrawer open={showDrawer} onClose={closeDrawer} />
      )}
    </div>
  );
};

export default ChatContainer;