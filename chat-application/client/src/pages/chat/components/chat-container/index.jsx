import ChatHeader from "./components/chat-header";
import ChannelInfoDrawer from "./components/channel-info-drawer";
import UserInfoDrawer from "./components/user-info-drawer";
import MessageBar from "./components/message-bar";
import MessageContainer from "./components/message-container";
import LiveUpdatesCarousel from "@/components/LiveUpdatesCarousel";
import { useAppStore } from "@/store";
import { useState } from "react";

const ChatContainer = () => {
  const { selectedChatType, selectedChatData } = useAppStore();
  const [showDrawer, setShowDrawer] = useState(false);
  
  const openDrawer = () => setShowDrawer(true);
  const closeDrawer = () => setShowDrawer(false);
  
  // Determine which drawer to show based on conversation type
  const isChannel = selectedChatType === 'channel';
  
  return ( 
    <div className="fixed top-0 h-[100vh] w-[100vw] bg-[#1c1d25] flex flex-col md:static md:flex-1" onClick={() => showDrawer && setShowDrawer(false)}>
      <div onClick={(e) => e.stopPropagation()}>
        <ChatHeader onHeaderClick={openDrawer} />
      </div>
      {/* Show Live Updates Carousel only for channels */}
      {isChannel && selectedChatData?._id && (
        <div className="px-4 pt-2">
          <LiveUpdatesCarousel groupId={selectedChatData._id} />
        </div>
      )}
      <MessageContainer />
      <MessageBar />
      
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