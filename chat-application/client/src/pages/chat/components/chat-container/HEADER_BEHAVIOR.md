# Conditional Header Behavior Implementation

## Overview

The chat header now dynamically shows different information and opens different drawers based on the conversation type (channel vs direct chat).

## Features Implemented

### ✅ **1. Conditional Conversation Type Detection**
- **Channel Detection**: `selectedChatType === 'channel'`
- **Direct Chat Detection**: `selectedChatType === 'contact'`
- **Dynamic Component Loading**: Different drawers based on conversation type

### ✅ **2. Channel Header Behavior**
- **Visual Indicator**: Purple "ℹ️ Info" badge
- **Tooltip**: "Click to view channel info"
- **Action**: Opens `ChannelInfoDrawer` with channel details
- **Content**: Channel name, description, members, admin controls

### ✅ **3. Direct Chat Header Behavior**
- **Visual Indicator**: Green "👤 Profile" badge
- **Tooltip**: "Click to view user profile"
- **Action**: Opens `UserInfoDrawer` with user details
- **Content**: User profile, online status, contact info, actions

### ✅ **4. Dynamic Drawer Rendering**
- **Conditional Logic**: `isChannel ? ChannelInfoDrawer : UserInfoDrawer`
- **No Caching Issues**: Fresh component rendering on conversation switch
- **Proper State Management**: Drawer state resets when switching conversations

## Technical Implementation

### **ChatContainer Component**

```jsx
import ChannelInfoDrawer from "./components/channel-info-drawer";
import UserInfoDrawer from "./components/user-info-drawer";

const ChatContainer = () => {
  const { selectedChatType } = useAppStore();
  const [showDrawer, setShowDrawer] = useState(false);
  
  // Determine which drawer to show based on conversation type
  const isChannel = selectedChatType === 'channel';
  
  return (
    <div>
      <ChatHeader onHeaderClick={openDrawer} />
      
      {/* Conditionally render the appropriate drawer */}
      {isChannel ? (
        <ChannelInfoDrawer open={showDrawer} onClose={closeDrawer} />
      ) : (
        <UserInfoDrawer open={showDrawer} onClose={closeDrawer} />
      )}
    </div>
  );
};
```

### **ChatHeader Component**

```jsx
const ChatHeader = ({ onHeaderClick }) => {
  const { selectedChatType, selectedChatData } = useAppStore();
  
  return (
    <div onClick={handleProfileClick}>
      {/* Channel Header */}
      {selectedChatType === "channel" && (
        <>
          <span>{selectedChatData?.name}</span>
          <span className="bg-purple-600">
            <span>ℹ️</span>
            <span>Info</span>
          </span>
        </>
      )}
      
      {/* User Header */}
      {selectedChatType === "contact" && (
        <>
          <span>{`${selectedChatData.firstName} ${selectedChatData.lastName}`}</span>
          <span className="bg-green-600">
            <span>👤</span>
            <span>Profile</span>
          </span>
        </>
      )}
    </div>
  );
};
```

### **UserInfoDrawer Component**

```jsx
const UserInfoDrawer = ({ open, onClose }) => {
  const { selectedChatData, onlineUsers } = useAppStore();
  
  return (
    <div className={`${open ? 'translate-x-0' : 'translate-x-full'}`}>
      {/* User Profile Section */}
      <div className="text-center">
        <Avatar />
        <h3>{displayName}</h3>
        <p>{selectedChatData?.email}</p>
        <span>{isOnline ? 'Online' : `Last seen ${lastSeenText}`}</span>
      </div>
      
      {/* User Details */}
      <div className="space-y-4">
        <div>About: {selectedChatData?.bio}</div>
        <div>Contact Information</div>
        <div>Actions (Block, Report)</div>
      </div>
    </div>
  );
};
```

## Component Structure

```
chat-container/
├── index.jsx                    # Main container with conditional logic
├── components/
│   ├── chat-header/
│   │   └── index.jsx           # Header with conditional indicators
│   ├── channel-info-drawer.jsx # Channel information drawer
│   ├── user-info-drawer.jsx    # User profile drawer
│   ├── message-container/
│   └── message-bar/
└── HeaderTest.jsx              # Test component for demonstration
```

## State Management

### **Store Integration**
- **selectedChatType**: Determines conversation type ('channel' | 'contact')
- **selectedChatData**: Contains conversation data
- **onlineUsers**: Tracks online status for direct chats

### **Local State**
- **showDrawer**: Controls drawer visibility
- **loading**: Manages loading states in drawers

## User Experience

### **Channel Conversations**
1. **Header Display**: Channel name + purple "ℹ️ Info" badge
2. **Click Action**: Opens channel info drawer
3. **Content**: Channel details, members, admin controls
4. **Visual Feedback**: Purple color scheme

### **Direct Conversations**
1. **Header Display**: User name + green "👤 Profile" badge
2. **Click Action**: Opens user profile drawer
3. **Content**: User profile, online status, contact info
4. **Visual Feedback**: Green color scheme

## Testing

### **Manual Testing**
1. **Switch to Channel**: Use test controls to switch to channel
2. **Click Header**: Verify channel info drawer opens
3. **Switch to User**: Use test controls to switch to user
4. **Click Header**: Verify user profile drawer opens
5. **Switch Back**: Ensure proper component switching

### **Test Component**
```jsx
// Use HeaderTest.jsx for easy testing
import HeaderTest from './components/HeaderTest';

// Provides mock data and switching controls
```

## Error Handling

### **Fallback Behavior**
- **Missing Data**: Graceful fallbacks for missing user/channel data
- **Invalid Types**: Default to user profile for unknown types
- **Loading States**: Proper loading indicators in drawers

### **Edge Cases**
- **No Conversation Selected**: Disabled header click
- **Invalid Conversation Type**: Fallback to user profile
- **Missing User Data**: Show placeholder content

## Performance Considerations

### **Optimizations**
- **Conditional Rendering**: Only render active drawer
- **State Reset**: Clear drawer state on conversation switch
- **Memoization**: Prevent unnecessary re-renders

### **Memory Management**
- **Component Cleanup**: Proper cleanup on unmount
- **State Cleanup**: Reset states when switching conversations

## Future Enhancements

### **Planned Features**
- [ ] **Group Chat Support**: Additional conversation types
- [ ] **Custom Drawers**: Plugin system for custom info panels
- [ ] **Keyboard Shortcuts**: Quick access to info panels
- [ ] **Search Integration**: Search within drawer content

### **Improvements**
- [ ] **Caching**: Smart caching for frequently accessed data
- [ ] **Animations**: Smooth transitions between drawer types
- [ ] **Responsive Design**: Better mobile drawer experience

---

## Usage Examples

### **Basic Implementation**
```jsx
// The conditional logic is automatically handled
<ChatContainer />
```

### **Custom Integration**
```jsx
const MyChatComponent = () => {
  const { selectedChatType } = useAppStore();
  
  return (
    <div>
      <ChatHeader onHeaderClick={handleHeaderClick} />
      {selectedChatType === 'channel' ? (
        <ChannelInfoDrawer />
      ) : (
        <UserInfoDrawer />
      )}
    </div>
  );
};
```

The implementation ensures that users get the appropriate information panel based on their conversation type, with clear visual indicators and smooth transitions.
