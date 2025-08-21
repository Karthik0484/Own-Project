# Whiteboard Component Documentation

## Overview

The Whiteboard component is a fully-featured collaborative drawing tool integrated into the chat application. It provides real-time drawing capabilities with multiple tools, undo/redo functionality, and voice chat integration.

## Features

### 🎨 Drawing Tools

#### 1. **Pen Tool**
- **Function**: Freehand drawing
- **Cursor**: Custom pencil cursor
- **Usage**: Click and drag to draw
- **Customization**: Color and brush size adjustable

#### 2. **Eraser Tool**
- **Function**: Erase drawn strokes
- **Cursor**: Custom eraser cursor
- **Usage**: Click and drag to erase
- **Implementation**: Uses `globalCompositeOperation = 'destination-out'`

#### 3. **Rectangle Tool**
- **Function**: Draw rectangles
- **Cursor**: Crosshair cursor
- **Usage**: Click and drag to draw rectangle
- **Shift Key**: Hold Shift for perfect squares
- **Features**: Outline and fill with selected color

#### 4. **Circle Tool**
- **Function**: Draw circles
- **Cursor**: Crosshair cursor
- **Usage**: Click and drag to draw circle
- **Shift Key**: Hold Shift for perfect circles
- **Features**: Outline and fill with selected color

#### 5. **Text Tool**
- **Function**: Add text to canvas
- **Cursor**: Text cursor
- **Usage**: Click to place text, then type
- **Features**: 
  - Font size based on brush size slider
  - Color matches selected color
  - Enter to confirm, Escape to cancel

### 🔧 Actions & Utilities

#### **Undo/Redo System**
- **Implementation**: Canvas state stack
- **Undo**: Reverts last action
- **Redo**: Restores undone action
- **Storage**: Canvas image data for each action
- **UI**: Disabled state when no actions available

#### **Clear Canvas**
- **Function**: Clears entire whiteboard
- **Implementation**: Fills canvas with white
- **Socket**: Emits clear event to other participants

#### **Export Functionality**
- **Format**: PNG image
- **Filename**: `whiteboard-{chatId}-{timestamp}.png`
- **Usage**: Automatic download

#### **Save Snapshot**
- **Function**: Save to chat history
- **Implementation**: Sends canvas data to server
- **Feedback**: Success toast notification

### 🎤 Voice Chat Integration

- **Enable/Disable**: Toggle voice chat functionality
- **Mute/Unmute**: Control microphone
- **Participants**: Real-time participant list
- **Visual Feedback**: Speaking indicators
- **Responsive**: Hidden on mobile for space efficiency

## Technical Implementation

### State Management

```javascript
// Core drawing state
const [isDrawing, setIsDrawing] = useState(false);
const [tool, setTool] = useState('pen');
const [color, setColor] = useState('#000000');
const [brushSize, setBrushSize] = useState(2);

// Undo/Redo state
const [undoStack, setUndoStack] = useState([]);
const [redoStack, setRedoStack] = useState([]);

// Text tool state
const [isTextMode, setIsTextMode] = useState(false);
const [textInput, setTextInput] = useState('');
const [textPosition, setTextPosition] = useState({ x: 0, y: 0 });
const [isTextInputVisible, setIsTextInputVisible] = useState(false);

// Shape drawing state
const [shapeStart, setShapeStart] = useState(null);
const [isShiftPressed, setIsShiftPressed] = useState(false);
```

### Canvas Management

#### **Responsive Sizing**
```javascript
const containerRect = container.getBoundingClientRect();
const maxWidth = Math.min(800, containerRect.width - 32);
const maxHeight = Math.min(600, containerRect.height - 32);
canvas.width = maxWidth;
canvas.height = maxHeight;
```

#### **State Saving**
```javascript
const saveCanvasState = () => {
  const imageData = canvas.toDataURL();
  setUndoStack(prev => [...prev, imageData]);
  setRedoStack([]); // Clear redo when new action
};
```

### Event Handling

#### **Mouse Events**
- `onMouseDown`: Start drawing/shape/text placement
- `onMouseMove`: Continue drawing/shape preview
- `onMouseUp`: End drawing action
- `onMouseLeave`: Stop drawing

#### **Touch Events**
- `onTouchStart`: Convert to mouse events
- `onTouchMove`: Handle touch drawing
- `onTouchEnd`: Stop touch drawing

#### **Keyboard Events**
- `Shift` key: Perfect shapes (squares/circles)
- `Enter` key: Confirm text input
- `Escape` key: Cancel text input

### Socket Integration

#### **Real-time Collaboration**
```javascript
// Join whiteboard session
socket.emit('whiteboard:join', { 
  chatId, 
  chatType, 
  userId: userInfo.id,
  userInfo: { /* user details */ }
});

// Send drawing data
socket.emit('whiteboard:draw', {
  chatId,
  type: 'path|shape|text|clear',
  // ... tool-specific data
  userId: userInfo.id,
  timestamp: Date.now()
});
```

## Responsive Design

### **Desktop (lg+)**
- Sidebar toolbar with vertical layout
- Full tooltip visibility
- Voice participants list visible
- Custom cursors enabled

### **Tablet (md-lg)**
- Adaptive toolbar layout
- Responsive canvas sizing
- Touch-optimized interactions

### **Mobile (sm-)**
- Collapsible toolbar
- Horizontal tool layout
- Touch-friendly button sizes (44px minimum)
- Simplified voice chat interface

## Accessibility Features

### **Keyboard Navigation**
- Full keyboard support for all tools
- Tab navigation through toolbar
- Enter/Space activation for buttons

### **Screen Reader Support**
- Descriptive tooltips
- ARIA labels for buttons
- Semantic HTML structure

### **Visual Accessibility**
- High contrast color schemes
- Dark mode support
- Clear visual feedback for active states

## CSS Customization

### **Custom Cursors**
```css
.whiteboard-canvas.pen-tool {
  cursor: url("data:image/svg+xml;...") 0 20, auto;
}

.whiteboard-canvas.eraser-tool {
  cursor: url("data:image/svg+xml;...") 10 10, auto;
}
```

### **Responsive Breakpoints**
```css
@media (max-width: 768px) {
  .whiteboard-canvas {
    cursor: pointer;
  }
}
```

## Usage Examples

### **Basic Implementation**
```jsx
import WhiteboardModal from './components/whiteboard/WhiteboardModal';

const ChatComponent = () => {
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);
  
  return (
    <>
      <button onClick={() => setIsWhiteboardOpen(true)}>
        Open Whiteboard
      </button>
      
      <WhiteboardModal
        isOpen={isWhiteboardOpen}
        onClose={() => setIsWhiteboardOpen(false)}
        chatId="chat-123"
        chatType="contact"
        chatName="John Doe"
      />
    </>
  );
};
```

### **Tool Selection**
```jsx
// Programmatically change tools
const setDrawingMode = () => setTool('pen');
const setEraserMode = () => setTool('eraser');
const setTextMode = () => setTool('text');
```

## Performance Considerations

### **Canvas Optimization**
- Efficient state management
- Minimal re-renders
- Optimized drawing algorithms

### **Memory Management**
- Proper cleanup of event listeners
- Canvas state cleanup on unmount
- Efficient undo/redo stack management

### **Network Optimization**
- Compressed drawing data
- Efficient socket event handling
- Minimal data transfer

## Browser Compatibility

### **Supported Browsers**
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

### **Required APIs**
- Canvas API
- WebRTC (for voice chat)
- Touch Events API
- WebSocket API

## Troubleshooting

### **Common Issues**

1. **Canvas not drawing**
   - Check if canvas context is initialized
   - Verify mouse/touch event handling
   - Ensure proper canvas sizing

2. **Undo/Redo not working**
   - Verify state stack management
   - Check canvas state saving
   - Ensure proper image loading

3. **Voice chat issues**
   - Check microphone permissions
   - Verify WebRTC support
   - Ensure socket connection

### **Debug Mode**
Enable debug logging by setting:
```javascript
localStorage.setItem('whiteboard-debug', 'true');
```

## Future Enhancements

### **Planned Features**
- [ ] Layer management
- [ ] Image import/export
- [ ] Advanced shapes (polygons, arrows)
- [ ] Brush presets
- [ ] Collaborative cursors
- [ ] Recording/playback

### **Performance Improvements**
- [ ] WebGL rendering
- [ ] Offline support
- [ ] Progressive loading
- [ ] Compression optimization

---

## License

This component is part of the chat application and follows the same licensing terms.
