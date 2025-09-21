# Live Updates Feature for Connectify

## Overview

The Live Updates feature enables real-time announcements and updates within group (channel) chats. Group admins can post updates that are instantly visible to all group members in a swipeable carousel above the chat messages.

## Features

### ✅ Implemented Features

1. **Group-Specific Updates**: Updates are scoped to specific groups/channels
2. **Real-Time Broadcasting**: Updates appear instantly across all devices via WebSocket
3. **Role-Based Access Control**: Only group admins can create, edit, and delete updates
4. **Responsive Carousel**: Horizontal swipeable interface for mobile and desktop
5. **Rich Update Content**: Support for title, description, links, priority, and expiry dates
6. **Admin Interface**: Full CRUD operations for group admins
7. **Auto-Expiry**: Updates automatically expire based on set date
8. **Priority System**: Updates can be prioritized (Normal, Low, Medium, High)

## Technical Architecture

### Backend (Node.js + Express + MongoDB)

#### Database Schema
```javascript
{
  _id: ObjectId,
  title: String (required, max 200 chars),
  description: String (optional, max 500 chars),
  link: String (optional, URL validation),
  groupId: ObjectId (ref: Channel, required),
  createdBy: ObjectId (ref: User, required),
  isActive: Boolean (default: true),
  priority: Number (0-10, default: 0),
  expiresAt: Date (optional),
  createdAt: Date,
  updatedAt: Date
}
```

#### API Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/updates/group/:groupId` | Get all updates for a group | Yes |
| GET | `/api/updates/group/:groupId/latest` | Get latest updates for carousel | Yes |
| GET | `/api/updates/group/:groupId/admin` | Check if user is group admin | Yes |
| POST | `/api/updates/group/:groupId` | Create new update (Admin only) | Yes |
| PUT | `/api/updates/:id` | Update existing update (Admin only) | Yes |
| DELETE | `/api/updates/:id` | Delete update (Admin only) | Yes |
| GET | `/api/updates/:id` | Get specific update by ID | Yes |

#### WebSocket Events

| Event | Description | Data |
|-------|-------------|------|
| `join-group` | Join group room for updates | `{ groupId }` |
| `leave-group` | Leave group room | `{ groupId }` |
| `updates:new` | New update created | `{ update }` |
| `updates:updated` | Update modified | `{ update }` |
| `updates:deleted` | Update deleted | `{ updateId }` |

### Frontend (React + Tailwind CSS)

#### Components

1. **LiveUpdatesCarousel**: Main component for displaying updates
   - Responsive carousel with navigation
   - Admin controls (add, edit, delete)
   - Real-time updates via WebSocket
   - Form validation and error handling

2. **Integration Points**:
   - `ChatContainer`: Shows carousel only for channels
   - `SocketContext`: Handles real-time updates
   - `useAppStore`: Manages application state

## Usage Guide

### For Group Admins

1. **Creating Updates**:
   - Click the "+ Add Update" button in the carousel
   - Fill in the title (required) and optional fields
   - Set priority and expiry date if needed
   - Click "Create Update"

2. **Editing Updates**:
   - Click the edit icon on any update
   - Modify the fields as needed
   - Click "Update" to save changes

3. **Deleting Updates**:
   - Click the delete icon on any update
   - Confirm deletion in the popup

### For Group Members

1. **Viewing Updates**:
   - Updates appear automatically in the carousel
   - Swipe left/right or use navigation arrows
   - Click external link icon to open links
   - Updates are sorted by priority and creation date

## Installation & Setup

### Backend Setup

1. **Install Dependencies**:
   ```bash
   cd chat-application/server
   npm install
   ```

2. **Database Migration**:
   The Updates model is already included. No additional migration needed.

3. **Environment Variables**:
   Ensure your `.env` file includes:
   ```
   DATABASE_URL=your_mongodb_connection_string
   JWT_KEY=your_jwt_secret
   ORIGIN=your_frontend_url
   ```

4. **Start Server**:
   ```bash
   npm start
   ```

### Frontend Setup

1. **Install Dependencies**:
   ```bash
   cd chat-application/client
   npm install
   ```

2. **Start Development Server**:
   ```bash
   npm run dev
   ```

## Testing

### Manual Testing

1. **Create a Test Group**:
   - Create a channel in your app
   - Note the channel ID

2. **Test Admin Functions**:
   - Login as a user who is admin of the group
   - Navigate to the group chat
   - Try creating, editing, and deleting updates

3. **Test Real-Time Updates**:
   - Open the group chat in multiple browser tabs
   - Create an update in one tab
   - Verify it appears instantly in other tabs

### API Testing

Use the provided test script:

```bash
cd chat-application
node test-updates.js
```

Make sure to update the test variables in the script:
- `BASE_URL`: Your server URL
- `TEST_GROUP_ID`: A valid group/channel ID
- `TEST_TOKEN`: A valid JWT token

## Security Features

1. **Authentication**: All endpoints require valid JWT token
2. **Authorization**: Group admin checks for create/update/delete operations
3. **Group Membership**: Users can only view updates from groups they belong to
4. **Input Validation**: Server-side validation for all input fields
5. **URL Validation**: Link fields are validated for proper URL format

## Performance Considerations

1. **Database Indexing**: Optimized indexes for efficient querying
2. **Pagination**: Large result sets are paginated
3. **Real-Time Efficiency**: WebSocket events are scoped to specific groups
4. **Caching**: Updates are cached on the frontend
5. **Auto-Expiry**: Expired updates are automatically filtered out

## Troubleshooting

### Common Issues

1. **Updates Not Appearing**:
   - Check if user is a member of the group
   - Verify WebSocket connection
   - Check browser console for errors

2. **Admin Functions Not Working**:
   - Verify user is group admin
   - Check authentication token
   - Ensure proper API endpoints

3. **Real-Time Updates Not Working**:
   - Check WebSocket connection status
   - Verify socket event listeners
   - Check server logs for errors

### Debug Mode

Enable debug logging by setting:
```javascript
localStorage.setItem('debug', 'socket.io-client:*');
```

## Future Enhancements

1. **Rich Text Support**: Markdown or rich text formatting
2. **File Attachments**: Support for images and documents
3. **Push Notifications**: Mobile push notifications for updates
4. **Update Categories**: Categorize updates by type
5. **Analytics**: Track update engagement and views
6. **Bulk Operations**: Select and manage multiple updates
7. **Templates**: Pre-defined update templates
8. **Scheduling**: Schedule updates for future posting

## API Documentation

### Request/Response Examples

#### Create Update
```javascript
POST /api/updates/group/:groupId
{
  "title": "Important Announcement",
  "description": "Please read this important update",
  "link": "https://example.com/details",
  "priority": 5,
  "expiresAt": "2024-12-31T23:59:59.000Z"
}

Response:
{
  "success": true,
  "message": "Update created successfully",
  "update": {
    "_id": "...",
    "title": "Important Announcement",
    "description": "Please read this important update",
    "link": "https://example.com/details",
    "priority": 5,
    "expiresAt": "2024-12-31T23:59:59.000Z",
    "groupId": "...",
    "createdBy": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

#### Get Latest Updates
```javascript
GET /api/updates/group/:groupId/latest?limit=5

Response:
{
  "success": true,
  "updates": [
    {
      "_id": "...",
      "title": "Latest Update",
      "description": "This is the latest update",
      "link": "https://example.com",
      "priority": 10,
      "createdBy": {
        "firstName": "Jane",
        "lastName": "Smith"
      },
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

## Support

For issues or questions regarding the Live Updates feature:

1. Check the troubleshooting section above
2. Review the API documentation
3. Check server and browser console logs
4. Verify database connectivity and permissions

## License

This feature is part of the Connectify chat application and follows the same license terms.
