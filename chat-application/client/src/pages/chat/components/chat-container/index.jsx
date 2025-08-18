import ChatHeader from "./components/chat-header";
import ChannelInfoDrawer from "./components/channel-info-drawer";
import MessageBar from "./components/message-bar";
import MessageContainer from "./components/message-container";

import { useState } from "react";

const ChatContainer = () => {
  const [showDrawer, setShowDrawer] = useState(false);
  const openDrawer = () => setShowDrawer(true);
  return ( 
  <div className="fixed top-0 h-[100vh] w-[100vw] bg-[#1c1d25] flex flex-col md:static md:flex-1" onClick={() => showDrawer && setShowDrawer(false)}>
    <div onClick={(e) => e.stopPropagation()}>
      <ChatHeader onHeaderClick={openDrawer} />
    </div>
    <MessageContainer />
    <MessageBar />
    <ChannelInfoDrawer open={showDrawer} onClose={() => setShowDrawer(false)} />
  </div>
  );
};

export default ChatContainer;