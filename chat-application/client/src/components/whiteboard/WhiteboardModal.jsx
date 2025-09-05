import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSocket } from '@/context/SocketContext';
import { useAppStore } from '@/store';
import { toast } from 'sonner';
import './WhiteboardModal.css';
import { 
  X, 
  Pen, 
  Square, 
  Circle, 
  Type, 
  Undo2, 
  Redo2,
  Trash2, 
  Download, 
  Camera,
  Users,
  Lock,
  Unlock,
  Menu,
  Eraser
} from 'lucide-react';
import VoiceChat from './VoiceChat';

const WhiteboardModal = ({ isOpen, onClose, chatId, chatType, chatName }) => {
  const socket = useSocket();
  const { userInfo } = useAppStore();
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(2);
  const [eraserSize, setEraserSize] = useState(20);
  const [participants, setParticipants] = useState([]);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentPath, setCurrentPath] = useState([]);
  const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(false);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [isTextMode, setIsTextMode] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [textPosition, setTextPosition] = useState({ x: 0, y: 0 });
  const [isTextInputVisible, setIsTextInputVisible] = useState(false);
  const [shapeStart, setShapeStart] = useState(null);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [remoteCursors, setRemoteCursors] = useState({});
  const [isConnected, setIsConnected] = useState(false);
  const [lastEmittedTime, setLastEmittedTime] = useState(0);
  const [throttleDelay] = useState(20); // 20ms throttle for mouse move events
  const drawThrottleRef = useRef(null);

  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', 
    '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#008000'
  ];

  // Initialize Canvas with fixed sizing for consistency
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;

    const canvas = canvasRef.current;
    
    // Use fixed canvas size for all users to ensure consistency
    const CANVAS_WIDTH = 800;
    const CANVAS_HEIGHT = 600;
    
    // Set canvas size
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    
    const context = canvas.getContext('2d');
    context.lineCap = 'round';
    context.strokeStyle = color;
    context.lineWidth = brushSize;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    contextRef.current = context;
    
    // Save initial state
    saveCanvasState();
  }, [isOpen]);

  // Coordinate normalization functions
  const normalizeCoordinates = useCallback((x, y) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    // Ensure coordinates are within canvas bounds
    const clampedX = Math.max(0, Math.min(x, canvas.width));
    const clampedY = Math.max(0, Math.min(y, canvas.height));
    
    return {
      x: clampedX / canvas.width,
      y: clampedY / canvas.height
    };
  }, []);

  const denormalizeCoordinates = useCallback((normalizedX, normalizedY) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    // Ensure normalized coordinates are within 0-1 range
    const clampedX = Math.max(0, Math.min(normalizedX, 1));
    const clampedY = Math.max(0, Math.min(normalizedY, 1));
    
    return {
      x: clampedX * canvas.width,
      y: clampedY * canvas.height
    };
  }, []);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(true);
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Update cursor based on tool
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    switch (tool) {
      case 'pen':
        canvas.style.cursor = 'crosshair';
        break;
      case 'eraser':
        // Create dynamic eraser cursor based on eraser size
        const cursorSize = Math.max(20, eraserSize);
        const cursorRadius = eraserSize / 2;
        canvas.style.cursor = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='${cursorSize}' height='${cursorSize}' viewBox='0 0 ${cursorSize} ${cursorSize}'><rect x='${cursorSize/2 - cursorRadius}' y='${cursorSize/2 - cursorRadius}' width='${eraserSize}' height='${eraserSize}' fill='none' stroke='black' stroke-width='1' stroke-dasharray='2,2'/><circle cx='${cursorSize/2}' cy='${cursorSize/2}' r='2' fill='black'/></svg>") ${cursorSize/2} ${cursorSize/2}, auto`;
        break;
      case 'text':
        canvas.style.cursor = 'text';
        break;
      case 'rect':
      case 'circle':
        canvas.style.cursor = 'crosshair';
        break;
      default:
        canvas.style.cursor = 'default';
    }
  }, [tool, eraserSize]);

  // Enhanced real-time collaboration socket handlers
  useEffect(() => {
    if (!isOpen || !socket) return;

    console.log('Joining whiteboard session:', { chatId, userId: userInfo.id });

    // Join whiteboard session
    socket.emit('whiteboard:join', { 
      chatId, 
      chatType, 
      userId: userInfo.id,
      userInfo: {
        id: userInfo.id,
        name: `${userInfo.firstName} ${userInfo.lastName}`,
        avatar: userInfo.image
      }
    });
    
    setIsConnected(true);
    
    // Socket event listeners
    socket.on('whiteboard:user_joined', handleUserJoined);
    socket.on('whiteboard:user_left', handleUserLeft);
    socket.on('whiteboard:draw', handleRemoteDraw);
    socket.on('whiteboard:shape_drawn', handleRemoteShape);
    socket.on('whiteboard:text_added', handleRemoteText);
    socket.on('whiteboard:canvas_cleared', handleRemoteClear);
    socket.on('whiteboard:undo_redo', handleRemoteUndoRedo);
    socket.on('whiteboard:cursor_move', handleRemoteCursor);
    socket.on('whiteboard:board_state', handleBoardState);
    socket.on('whiteboard:lock_status', handleLockStatus);

    return () => {
      console.log('Leaving whiteboard session:', { chatId, userId: userInfo.id });
      socket.emit('whiteboard:leave', { chatId, userId: userInfo.id });
      socket.off('whiteboard:user_joined', handleUserJoined);
      socket.off('whiteboard:user_left', handleUserLeft);
      socket.off('whiteboard:draw', handleRemoteDraw);
      socket.off('whiteboard:shape_drawn', handleRemoteShape);
      socket.off('whiteboard:text_added', handleRemoteText);
      socket.off('whiteboard:canvas_cleared', handleRemoteClear);
      socket.off('whiteboard:undo_redo', handleRemoteUndoRedo);
      socket.off('whiteboard:cursor_move', handleRemoteCursor);
      socket.off('whiteboard:board_state', handleBoardState);
      socket.off('whiteboard:lock_status', handleLockStatus);
      setIsConnected(false);
    };
  }, [isOpen, socket, chatId, userInfo.id]);

  // Socket event handlers
  const handleUserJoined = useCallback((data) => {
    setParticipants(data.allParticipants);
    setIsAdmin(data.isAdmin);
    toast.info(`✏️ ${data.participant.userInfo.name} joined whiteboard`);
  }, []);

  const handleUserLeft = useCallback((data) => {
    setParticipants(prev => prev.filter(p => p.socketId !== data.socketId));
    setRemoteCursors(prev => {
      const newCursors = { ...prev };
      delete newCursors[data.userId];
      return newCursors;
    });
    toast.info('👋 A participant left the whiteboard');
  }, []);

  const handleRemoteDraw = useCallback((data) => {
    if (data.userId === userInfo.id) return;

    const context = contextRef.current;
    if (!context) return;

    const { x0, y0, x1, y1, tool, color, brushSize } = data;
    
    // Denormalize coordinates
    const startCoords = denormalizeCoordinates(x0, y0);
    const endCoords = denormalizeCoordinates(x1, y1);
    
    console.log('Received remote draw:', {
      userId: data.userId,
      normalized: { x0, y0, x1, y1 },
      denormalized: { start: startCoords, end: endCoords },
      tool, color, brushSize
    });
    
    // Set drawing context
    context.strokeStyle = color || '#000000';
    context.lineWidth = brushSize || 2;
    context.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    
    // Draw the line segment
    context.beginPath();
    context.moveTo(startCoords.x, startCoords.y);
    context.lineTo(endCoords.x, endCoords.y);
    context.stroke();
    context.closePath();
    
    // Reset composite operation
    if (tool === 'eraser') {
      context.globalCompositeOperation = 'source-over';
    }
  }, [userInfo.id, denormalizeCoordinates]);

  const handleRemoteShape = useCallback((data) => {
    if (data.userId === userInfo.id) return;

    const context = contextRef.current;
    if (!context) return;

    // Denormalize shape coordinates
    const denormalizedShape = { ...data.shape };
    if (data.shape.type === 'rect') {
      const coords = denormalizeCoordinates(data.shape.x, data.shape.y);
      denormalizedShape.x = coords.x;
      denormalizedShape.y = coords.y;
      denormalizedShape.width = data.shape.width * canvasRef.current.width;
      denormalizedShape.height = data.shape.height * canvasRef.current.height;
    } else if (data.shape.type === 'circle') {
      const coords = denormalizeCoordinates(data.shape.x, data.shape.y);
      denormalizedShape.x = coords.x;
      denormalizedShape.y = coords.y;
      denormalizedShape.radius = data.shape.radius * Math.min(canvasRef.current.width, canvasRef.current.height);
    }

    drawShape(context, denormalizedShape, data.color, data.brushSize);
  }, [userInfo.id, denormalizeCoordinates]);

  const handleRemoteText = useCallback((data) => {
    if (data.userId === userInfo.id) return;

    const context = contextRef.current;
    if (!context) return;

    // Denormalize text position
    const textCoords = denormalizeCoordinates(data.x, data.y);
    drawText(context, data.text, textCoords.x, textCoords.y, data.color, data.fontSize);
  }, [userInfo.id, denormalizeCoordinates]);

  const handleRemoteClear = useCallback((data) => {
    if (data.userId === userInfo.id) return;

    const context = contextRef.current;
    if (!context) return;

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  }, [userInfo.id]);

  const handleRemoteUndoRedo = useCallback((data) => {
    if (data.userId === userInfo.id) return;

    const context = contextRef.current;
    if (!context) return;

    const img = new Image();
    img.onload = () => {
      context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      context.drawImage(img, 0, 0);
    };
    img.src = data.canvasState;
  }, [userInfo.id]);

  const handleRemoteCursor = useCallback((data) => {
    if (data.userId === userInfo.id) return;

    setRemoteCursors(prev => ({
      ...prev,
      [data.userId]: {
        x: data.x,
        y: data.y,
        tool: data.tool,
        name: data.userName
      }
    }));
  }, [userInfo.id]);

    const handleBoardState = useCallback((data) => {
    const context = contextRef.current;
    if (!context) return;

    console.log('Received board state:', data);

    // Clear canvas first
    context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    // If there's a canvas state image, load it
    if (data.canvasState) {
      const img = new Image();
      img.onload = () => {
        context.drawImage(img, 0, 0);
      };
      img.src = data.canvasState;
    }
    
    // Replay all actions from history with proper coordinate denormalization
    if (data.actions && Array.isArray(data.actions)) {
      console.log(`Replaying ${data.actions.length} actions from history`);
      data.actions.forEach((action, index) => {
        try {
          switch (action.type) {
            case 'draw':
              // Denormalize coordinates for replay
              const startCoords = denormalizeCoordinates(action.x0, action.y0);
              const endCoords = denormalizeCoordinates(action.x1, action.y1);
              
              // Set drawing context
              context.strokeStyle = action.color || '#000000';
              context.lineWidth = action.brushSize || 2;
              context.globalCompositeOperation = action.tool === 'eraser' ? 'destination-out' : 'source-over';
              
              // Draw the line segment
              context.beginPath();
              context.moveTo(startCoords.x, startCoords.y);
              context.lineTo(endCoords.x, endCoords.y);
              context.stroke();
              context.closePath();
              
              // Reset composite operation
              if (action.tool === 'eraser') {
                context.globalCompositeOperation = 'source-over';
              }
              break;
            case 'shape_drawn':
              // Denormalize shape coordinates for replay
              const denormalizedShape = { ...action.shape };
              if (action.shape.type === 'rect') {
                const coords = denormalizeCoordinates(action.shape.x, action.shape.y);
                denormalizedShape.x = coords.x;
                denormalizedShape.y = coords.y;
                denormalizedShape.width = action.shape.width * canvasRef.current.width;
                denormalizedShape.height = action.shape.height * canvasRef.current.height;
              } else if (action.shape.type === 'circle') {
                const coords = denormalizeCoordinates(action.shape.x, action.shape.y);
                denormalizedShape.x = coords.x;
                denormalizedShape.y = coords.y;
                denormalizedShape.radius = action.shape.radius * Math.min(canvasRef.current.width, canvasRef.current.height);
              }
              
              handleRemoteShape({
                userId: action.userId,
                shape: denormalizedShape,
                color: action.color,
                brushSize: action.brushSize
              });
              break;
            case 'text_added':
              // Denormalize text position
              const textCoords = denormalizeCoordinates(action.x, action.y);
              handleRemoteText({
                userId: action.userId,
                text: action.text,
                x: textCoords.x,
                y: textCoords.y,
                color: action.color,
                fontSize: action.fontSize
              });
              break;
            case 'canvas_cleared':
              handleRemoteClear({ userId: action.userId });
              break;
          }
        } catch (error) {
          console.error(`Error replaying action ${index}:`, error, action);
        }
      });
    }
  }, [denormalizeCoordinates]);

  const handleLockStatus = useCallback((data) => {
    setIsLocked(data.isLocked);
    if (data.isLocked) {
      toast.info(`🔒 Whiteboard locked by admin`);
    } else {
      toast.info(`🔓 Whiteboard unlocked by admin`);
    }
  }, []);

  // Throttled function for emitting cursor position
  const emitCursorPosition = useCallback((x, y) => {
    const now = Date.now();
    if (now - lastEmittedTime < throttleDelay) return;
    
    setLastEmittedTime(now);
    socket.emit('whiteboard:cursor_move', {
      chatId,
      userId: userInfo.id,
      x,
      y,
      tool,
      userName: `${userInfo.firstName} ${userInfo.lastName}`,
      timestamp: now
    });
  }, [socket, chatId, userInfo.id, tool, lastEmittedTime, throttleDelay]);

  // Save canvas state for undo/redo
  const saveCanvasState = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const imageData = canvas.toDataURL();
    
    setUndoStack(prev => [...prev, imageData]);
    setRedoStack([]); // Clear redo stack when new action is performed
  };

  // Undo functionality
  const undo = () => {
    if (isLocked && !isAdmin) return;
    if (undoStack.length === 0) return;
    
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;
    
    // Save current state to redo stack
    const currentState = canvas.toDataURL();
    setRedoStack(prev => [...prev, currentState]);
    
    // Restore previous state
    const previousState = undoStack[undoStack.length - 1];
    const img = new Image();
    img.onload = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(img, 0, 0);
    };
    img.src = previousState;
    
    setUndoStack(prev => prev.slice(0, -1));
    
    // Broadcast undo to other users
    socket.emit('whiteboard:undo_redo', {
      chatId,
      userId: userInfo.id,
      action: 'undo',
      canvasState: previousState,
      timestamp: Date.now()
    });
  };

  // Redo functionality
  const redo = () => {
    if (isLocked && !isAdmin) return;
    if (redoStack.length === 0) return;
    
    const canvas = canvasRef.current;
    const context = contextRef.current;
    if (!canvas || !context) return;
    
    // Save current state to undo stack
    const currentState = canvas.toDataURL();
    setUndoStack(prev => [...prev, currentState]);
    
    // Restore next state
    const nextState = redoStack[redoStack.length - 1];
    const img = new Image();
    img.onload = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(img, 0, 0);
    };
    img.src = nextState;
    
    setRedoStack(prev => prev.slice(0, -1));
    
    // Broadcast redo to other users
    socket.emit('whiteboard:undo_redo', {
      chatId,
      userId: userInfo.id,
      action: 'redo',
      canvasState: nextState,
      timestamp: Date.now()
    });
  };

  // Drawing functions with real-time sync
  const startDrawing = (e) => {
    if (isLocked && !isAdmin) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (tool === 'text') {
      setTextPosition({ x, y });
      setIsTextInputVisible(true);
      return;
    }
    
    if (tool === 'rect' || tool === 'circle') {
      setShapeStart({ x, y });
      return;
    }
    
    setIsDrawing(true);
    const context = contextRef.current;
    context.beginPath();
    context.moveTo(x, y);
    
    setCurrentPath([{ x, y }]);
    
    // Store the starting point for the next draw event
    setLastEmittedTime(Date.now());
  };



  const draw = (e) => {
    if (!isDrawing || (isLocked && !isAdmin)) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const context = contextRef.current;
    
    // Get the last point from current path
    const lastPoint = currentPath[currentPath.length - 1];
    if (!lastPoint) return;
    
    if (tool === 'pen') {
      context.lineTo(x, y);
      context.stroke();
    } else if (tool === 'eraser') {
      // Calculate eraser position (center of eraser at cursor position)
      const eraserX = x - eraserSize / 2;
      const eraserY = y - eraserSize / 2;
      
      // Clear the rectangular area
      context.clearRect(eraserX, eraserY, eraserSize, eraserSize);
    }
    
    setCurrentPath(prev => [...prev, { x, y }]);
    
         // Emit draw event with normalized line segment coordinates
     const now = Date.now();
     if (now - lastEmittedTime >= throttleDelay) {
       // Normalize coordinates before emitting
       const normalizedLastPoint = normalizeCoordinates(lastPoint.x, lastPoint.y);
       const normalizedCurrentPoint = normalizeCoordinates(x, y);
       
       console.log('Emitting draw event:', {
         chatId,
         userId: userInfo.id,
         from: { x: lastPoint.x, y: lastPoint.y },
         to: { x, y },
         normalized: {
           from: normalizedLastPoint,
           to: normalizedCurrentPoint
         },
         tool, color, brushSize: tool === 'eraser' ? eraserSize : brushSize
       });
       
       socket.emit('whiteboard:draw', {
         chatId,
         userId: userInfo.id,
         x0: normalizedLastPoint.x,
         y0: normalizedLastPoint.y,
         x1: normalizedCurrentPoint.x,
         y1: normalizedCurrentPoint.y,
         tool,
         color,
         brushSize: tool === 'eraser' ? eraserSize : brushSize,
         timestamp: now
       });
       setLastEmittedTime(now);
     }
    
    // Emit cursor position
    emitCursorPosition(x, y);
  };

  const stopDrawing = () => {
    if (!isDrawing && !shapeStart) return;
    
    setIsDrawing(false);
    
    if (tool === 'pen' || tool === 'eraser') {
      if (currentPath.length > 1) {
        saveCanvasState();
      }
    } else if (shapeStart && (tool === 'rect' || tool === 'circle')) {
      // Handle shape completion
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const x = event?.clientX ? event.clientX - rect.left : shapeStart.x;
      const y = event?.clientY ? event.clientY - rect.top : shapeStart.y;
      
      let shapeData = {};
      
      if (tool === 'rect') {
        const width = x - shapeStart.x;
        const height = y - shapeStart.y;
        
        if (isShiftPressed) {
          const size = Math.max(Math.abs(width), Math.abs(height));
          const signX = width >= 0 ? 1 : -1;
          const signY = height >= 0 ? 1 : -1;
          shapeData = {
            type: 'rect',
            x: shapeStart.x,
            y: shapeStart.y,
            width: size * signX,
            height: size * signY
          };
        } else {
          shapeData = {
            type: 'rect',
            x: shapeStart.x,
            y: shapeStart.y,
            width,
            height
          };
        }
      } else if (tool === 'circle') {
        const radius = Math.sqrt(Math.pow(x - shapeStart.x, 2) + Math.pow(y - shapeStart.y, 2));
        
        if (isShiftPressed) {
          const size = Math.max(Math.abs(x - shapeStart.x), Math.abs(y - shapeStart.y));
          shapeData = {
            type: 'circle',
            x: shapeStart.x,
            y: shapeStart.y,
            radius: size
          };
        } else {
          shapeData = {
            type: 'circle',
            x: shapeStart.x,
            y: shapeStart.y,
            radius
          };
        }
      }
      
      saveCanvasState();
      
             // Normalize shape coordinates before emitting
       const normalizedShape = { ...shapeData };
       if (tool === 'rect') {
         const coords = normalizeCoordinates(shapeData.x, shapeData.y);
         normalizedShape.x = coords.x;
         normalizedShape.y = coords.y;
         normalizedShape.width = shapeData.width / canvasRef.current.width;
         normalizedShape.height = shapeData.height / canvasRef.current.height;
       } else if (tool === 'circle') {
         const coords = normalizeCoordinates(shapeData.x, shapeData.y);
         normalizedShape.x = coords.x;
         normalizedShape.y = coords.y;
         normalizedShape.radius = shapeData.radius / Math.min(canvasRef.current.width, canvasRef.current.height);
       }
       
       // Emit shape completion to other users
       socket.emit('whiteboard:shape_drawn', {
         chatId,
         userId: userInfo.id,
         shape: normalizedShape,
         color,
         brushSize,
         timestamp: Date.now()
       });
    }
    
    setCurrentPath([]);
    setShapeStart(null);
  };

  // Shape drawing functions
  const drawShape = (context, shape, color, size) => {
    context.strokeStyle = color;
    context.lineWidth = size;
    context.fillStyle = color;
    
    if (shape.type === 'rect') {
      const { x, y, width, height } = shape;
      context.strokeRect(x, y, width, height);
    } else if (shape.type === 'circle') {
      const { x, y, radius } = shape;
      context.beginPath();
      context.arc(x, y, radius, 0, 2 * Math.PI);
      context.stroke();
    }
  };

  // Text drawing function
  const drawText = (context, text, x, y, color, fontSize) => {
    context.fillStyle = color;
    context.font = `${fontSize}px Arial`;
    context.fillText(text, x, y);
  };

  // Handle shape drawing with real-time sync
  const handleShapeDrawing = (e) => {
    if (!shapeStart || (isLocked && !isAdmin)) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const context = contextRef.current;
    const tempCanvas = document.createElement('canvas');
    const tempContext = tempCanvas.getContext('2d');
    
    tempCanvas.width = canvasRef.current.width;
    tempCanvas.height = canvasRef.current.height;
    tempContext.drawImage(canvasRef.current, 0, 0);
    
    // Emit cursor position for real-time feedback
    if (socket) {
      socket.emit('whiteboard:cursor_move', {
        chatId,
        userId: userInfo.id,
        x,
        y,
        tool,
        userName: `${userInfo.firstName} ${userInfo.lastName}`,
        timestamp: Date.now()
      });
    }
    context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    context.drawImage(tempCanvas, 0, 0);
    
    if (tool === 'rect') {
      const width = x - shapeStart.x;
      const height = y - shapeStart.y;
      
      if (isShiftPressed) {
        const size = Math.max(Math.abs(width), Math.abs(height));
        const signX = width >= 0 ? 1 : -1;
        const signY = height >= 0 ? 1 : -1;
        context.strokeRect(shapeStart.x, shapeStart.y, size * signX, size * signY);
      } else {
        context.strokeRect(shapeStart.x, shapeStart.y, width, height);
      }
    } else if (tool === 'circle') {
      const radius = Math.sqrt(Math.pow(x - shapeStart.x, 2) + Math.pow(y - shapeStart.y, 2));
      
      if (isShiftPressed) {
        const size = Math.max(Math.abs(x - shapeStart.x), Math.abs(y - shapeStart.y));
        context.beginPath();
        context.arc(shapeStart.x, shapeStart.y, size, 0, 2 * Math.PI);
        context.stroke();
      } else {
        context.beginPath();
        context.arc(shapeStart.x, shapeStart.y, radius, 0, 2 * Math.PI);
        context.stroke();
      }
    }
  };

  // Handle text input with real-time sync
  const handleTextSubmit = () => {
    if (!textInput.trim()) {
      setIsTextInputVisible(false);
      setTextInput('');
      return;
    }
    
    const context = contextRef.current;
    if (!context) return;
    
    drawText(context, textInput, textPosition.x, textPosition.y, color, brushSize * 8);
    
    saveCanvasState();
    
         // Normalize text position before emitting
     const normalizedTextPos = normalizeCoordinates(textPosition.x, textPosition.y);
     
     // Emit text addition to other users
     socket.emit('whiteboard:text_added', {
       chatId,
       userId: userInfo.id,
       text: textInput,
       x: normalizedTextPos.x,
       y: normalizedTextPos.y,
       color,
       fontSize: brushSize * 8,
       timestamp: Date.now()
     });
    
    setIsTextInputVisible(false);
    setTextInput('');
  };

  // Tool selection functions
  const setDrawingMode = () => {
    if (isLocked && !isAdmin) return;
    setTool('pen');
    setIsTextMode(false);
  };

  const setEraserMode = () => {
    if (isLocked && !isAdmin) return;
    setTool('eraser');
    setIsTextMode(false);
  };

  const addShape = (shapeType) => {
    if (isLocked && !isAdmin) return;
    setTool(shapeType);
    setIsTextMode(false);
  };

  const addText = () => {
    if (isLocked && !isAdmin) return;
    setTool('text');
    setIsTextMode(true);
  };

  const clearCanvas = () => {
    if (isLocked && !isAdmin) return;
    
    const context = contextRef.current;
    if (!context) return;
    
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    saveCanvasState();
    
    // Emit clear to other users
    socket.emit('whiteboard:canvas_cleared', {
      chatId,
      userId: userInfo.id,
      timestamp: Date.now()
    });
  };

  const exportCanvas = () => {
    if (!canvasRef.current) return;
    
    const dataURL = canvasRef.current.toDataURL('image/png');
    
    const link = document.createElement('a');
    link.download = `whiteboard-${chatId}-${Date.now()}.png`;
    link.href = dataURL;
    link.click();
  };

  const saveSnapshot = () => {
    if (!canvasRef.current) return;
    
    const dataURL = canvasRef.current.toDataURL('image/png');
    
    socket.emit('whiteboard:save_snapshot', {
      chatId,
      userId: userInfo.id,
      imageData: dataURL,
      timestamp: Date.now()
    });

    toast.success('📸 Snapshot saved to chat');
  };

  const toggleLock = () => {
    if (!isAdmin) return;
    
    socket.emit('whiteboard:toggle_lock', {
      chatId,
      userId: userInfo.id,
      isLocked: !isLocked
    });
  };

  // Update brush properties when color or size changes
  useEffect(() => {
    if (!contextRef.current) return;
    
    const context = contextRef.current;
    context.strokeStyle = color;
    context.lineWidth = brushSize;
  }, [color, brushSize]);

  // Ensure canvas is properly initialized when component mounts
  useEffect(() => {
    if (isOpen && canvasRef.current && !contextRef.current) {
      const canvas = canvasRef.current;
      const CANVAS_WIDTH = 800;
      const CANVAS_HEIGHT = 600;
      
      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;
      
      const context = canvas.getContext('2d');
      context.lineCap = 'round';
      context.strokeStyle = color;
      context.lineWidth = brushSize;
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      contextRef.current = context;
    }
  }, [isOpen, color, brushSize]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full h-full max-w-[95vw] max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white truncate">
              Whiteboard - {chatName}
            </h2>
            <div className="flex items-center gap-1 sm:gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Users className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">{participants.length} participants</span>
              <span className="sm:hidden">{participants.length}</span>
            </div>
            {isConnected && (
              <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs">Live</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            {isAdmin && (
              <button
                onClick={toggleLock}
                className={`p-2 rounded-lg transition-colors duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center ${
                  isLocked 
                    ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400' 
                    : 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400'
                }`}
                title={isLocked ? 'Unlock whiteboard' : 'Lock whiteboard'}
              >
                {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              </button>
            )}
            <button
              onClick={saveSnapshot}
              className="p-2 bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Save snapshot to chat"
            >
              <Camera className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Close whiteboard"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row min-h-0">
          {/* Toolbar - Responsive design */}
          <div className={`bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ${
            isToolbarCollapsed 
              ? 'lg:w-16 w-full h-16 lg:h-auto' 
              : 'lg:w-20 w-full h-auto'
          }`}>
            {/* Mobile toolbar toggle */}
            <div className="lg:hidden flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tools</span>
              <button
                onClick={() => setIsToolbarCollapsed(!isToolbarCollapsed)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
                title="Toggle toolbar"
              >
                <Menu className="w-4 h-4" />
              </button>
            </div>

            {/* Toolbar content */}
            <div className={`${isToolbarCollapsed ? 'hidden lg:flex lg:flex-col' : 'flex'} lg:flex-col gap-2 p-2 overflow-x-auto lg:overflow-x-visible lg:overflow-y-auto max-h-full`}>
              {/* Drawing tools */}
              <div className="flex lg:flex-col gap-1">
                <button
                  onClick={setDrawingMode}
                  className={`p-3 rounded-lg transition-colors duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center group relative ${
                    tool === 'pen' 
                      ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400' 
                      : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                  title="Pen tool - Draw freehand"
                >
                  <Pen className="w-5 h-5" />
                  <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10 lg:block hidden">
                    Pen tool
                  </span>
                </button>
                <button
                  onClick={setEraserMode}
                  className={`p-3 rounded-lg transition-colors duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center group relative ${
                    tool === 'eraser' 
                      ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400' 
                      : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                  title="Eraser tool - Erase drawings"
                >
                  <Eraser className="w-5 h-5" />
                  <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10 lg:block hidden">
                    Eraser
                  </span>
                </button>
                <button
                  onClick={() => addShape('rect')}
                  className={`p-3 rounded-lg transition-colors duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center group relative ${
                    tool === 'rect' 
                      ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400' 
                      : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                  title="Rectangle tool - Draw rectangles (hold Shift for square)"
                >
                  <Square className="w-5 h-5" />
                  <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10 lg:block hidden">
                    Rectangle
                  </span>
                </button>
                <button
                  onClick={() => addShape('circle')}
                  className={`p-3 rounded-lg transition-colors duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center group relative ${
                    tool === 'circle' 
                      ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400' 
                      : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                  title="Circle tool - Draw circles (hold Shift for perfect circle)"
                >
                  <Circle className="w-5 h-5" />
                  <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10 lg:block hidden">
                    Circle
                  </span>
                </button>
                <button
                  onClick={addText}
                  className={`p-3 rounded-lg transition-colors duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center group relative ${
                    tool === 'text' 
                      ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400' 
                      : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                  title="Text tool - Add text"
                >
                  <Type className="w-5 h-5" />
                  <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10 lg:block hidden">
                    Text tool
                  </span>
                </button>
              </div>

              <div className="border-t border-gray-300 dark:border-gray-600 my-2 lg:my-2"></div>

              {/* Actions */}
              <div className="flex lg:flex-col gap-1">
                <button
                  onClick={undo}
                  disabled={undoStack.length === 0}
                  className="p-3 bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center group relative disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Undo last action"
                >
                  <Undo2 className="w-5 h-5" />
                  <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10 lg:block hidden">
                    Undo
                  </span>
                </button>
                <button
                  onClick={redo}
                  disabled={redoStack.length === 0}
                  className="p-3 bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center group relative disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Redo last undone action"
                >
                  <Redo2 className="w-5 h-5" />
                  <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10 lg:block hidden">
                    Redo
                  </span>
                </button>
                <button
                  onClick={clearCanvas}
                  className="p-3 bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center group relative"
                  title="Clear entire canvas"
                >
                  <Trash2 className="w-5 h-5" />
                  <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10 lg:block hidden">
                    Clear canvas
                  </span>
                </button>
                <button
                  onClick={exportCanvas}
                  className="p-3 bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center group relative"
                  title="Export as PNG image"
                >
                  <Download className="w-5 h-5" />
                  <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10 lg:block hidden">
                    Export image
                  </span>
                </button>
              </div>

              <div className="border-t border-gray-300 dark:border-gray-600 my-2 lg:my-2"></div>

              {/* Voice chat - Fixed styling */}
              <div className="flex lg:flex-col gap-1">
                <VoiceChat 
                  chatId={chatId}
                  isEnabled={voiceEnabled}
                  onToggle={setVoiceEnabled}
                />
              </div>
            </div>
          </div>

          {/* Canvas area */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Color and size controls */}
            <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">Color:</span>
                  <div className="flex gap-1 flex-wrap">
                    {colors.map((c) => (
                      <button
                        key={c}
                        onClick={() => setColor(c)}
                        className={`w-6 h-6 rounded border-2 transition-all duration-200 hover:scale-110 ${
                          color === c ? 'border-black dark:border-white' : 'border-gray-300 dark:border-gray-600'
                        }`}
                        style={{ backgroundColor: c }}
                        title={`Select ${c} color`}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {tool === 'eraser' ? 'Eraser Size:' : 'Brush Size:'}
                  </span>
                  <input
                    type="range"
                    min={tool === 'eraser' ? "5" : "1"}
                    max={tool === 'eraser' ? "100" : "20"}
                    value={tool === 'eraser' ? eraserSize : brushSize}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (tool === 'eraser') {
                        setEraserSize(value);
                      } else {
                        setBrushSize(value);
                      }
                    }}
                    className="w-20 sm:w-24"
                    title={tool === 'eraser' ? `Eraser size: ${eraserSize}px` : `Brush size: ${brushSize}px`}
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {tool === 'eraser' ? `${eraserSize}px` : `${brushSize}px`}
                  </span>
                </div>
                {isLocked && (
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <Lock className="w-4 h-4" />
                    <span className="text-sm">Locked</span>
                  </div>
                )}
              </div>
            </div>

            {/* Canvas container */}
            <div className="flex-1 p-2 sm:p-4 flex justify-center items-center bg-gray-100 dark:bg-gray-900 min-h-0 relative">
              <div className="relative w-full h-full flex items-center justify-center">
                <canvas
                  ref={canvasRef}
                  className={`border border-gray-300 dark:border-gray-600 bg-white shadow-sm max-w-full max-h-full object-contain whiteboard-canvas ${
                    tool === 'pen' ? 'pen-tool' : 
                    tool === 'eraser' ? 'eraser-tool' : 
                    tool === 'text' ? 'text-tool' : 
                    (tool === 'rect' || tool === 'circle') ? 'shape-tool' : ''
                  }`}
                  onMouseDown={startDrawing}
                  onMouseMove={(e) => {
                    if (isDrawing) draw(e);
                    if (shapeStart) handleShapeDrawing(e);
                    // Emit cursor position
                    const rect = canvasRef.current.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    if (socket) {
                      socket.emit('whiteboard:cursor_move', {
                        chatId,
                        userId: userInfo.id,
                        x,
                        y,
                        tool,
                        userName: `${userInfo.firstName} ${userInfo.lastName}`,
                        timestamp: Date.now()
                      });
                    }
                  }}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    const touch = e.touches[0];
                    const mouseEvent = new MouseEvent('mousedown', {
                      clientX: touch.clientX,
                      clientY: touch.clientY
                    });
                    startDrawing(mouseEvent);
                  }}
                  onTouchMove={(e) => {
                    e.preventDefault();
                    const touch = e.touches[0];
                    const mouseEvent = new MouseEvent('mousemove', {
                      clientX: touch.clientX,
                      clientY: touch.clientY
                    });
                    if (isDrawing) draw(mouseEvent);
                    if (shapeStart) handleShapeDrawing(mouseEvent);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    stopDrawing();
                  }}
                />
                
                {/* Remote cursors overlay */}
                {Object.entries(remoteCursors).map(([userId, cursor]) => (
                  <div
                    key={userId}
                    className="absolute pointer-events-none z-10"
                    style={{
                      left: cursor.x,
                      top: cursor.y,
                      transform: 'translate(-50%, -50%)'
                    }}
                  >
                    <div className="flex flex-col items-center">
                      <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg"></div>
                      <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded mt-1 whitespace-nowrap">
                        {cursor.name}
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Text input overlay */}
                {isTextInputVisible && (
                  <div 
                    className="absolute z-10"
                    style={{ 
                      left: textPosition.x, 
                      top: textPosition.y - 20,
                      transform: 'translateY(-100%)'
                    }}
                  >
                    <input
                      type="text"
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleTextSubmit();
                        } else if (e.key === 'Escape') {
                          setIsTextInputVisible(false);
                          setTextInput('');
                        }
                      }}
                      onBlur={handleTextSubmit}
                      className="px-2 py-1 border border-gray-300 rounded text-sm bg-white dark:bg-gray-800 dark:text-white dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      style={{ 
                        fontSize: `${brushSize * 8}px`,
                        color: color
                      }}
                      autoFocus
                      placeholder="Type text..."
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhiteboardModal;