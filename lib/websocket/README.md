# Real-time Updates System

This system provides WebSocket-based real-time communication for the admin dashboard, enabling live updates for messages, campaigns, leads, and system notifications.

## Architecture

The real-time system consists of several components:

1. **WebSocket Server** (`server.ts`) - Manages WebSocket connections and message routing
2. **Event Service** (`events.ts`) - Handles different types of real-time events
3. **Notification Service** (`../notificationService.ts`) - Manages in-app and browser notifications
4. **Live Data Sync** (`../liveDataSync.ts`) - Synchronizes data changes across clients
5. **React Hooks** (`../../app/hooks/useWebSocket.ts`, `useLiveData.ts`) - Client-side integration

## Features

### WebSocket Communication
- Authenticated WebSocket connections
- Room-based subscriptions (user-specific, role-specific, contact-specific)
- Connection management with automatic reconnection
- Ping/pong heartbeat mechanism
- Connection pooling and cleanup

### Real-time Events
- **Message Events**: New messages, status updates, typing indicators
- **Campaign Events**: Progress updates, completion notifications
- **Lead Events**: Creation, assignment, status changes
- **System Events**: Alerts, errors, maintenance notifications
- **Stats Updates**: Live dashboard statistics

### Notification System
- In-app notification center with unread counts
- Browser notifications (with permission)
- Toast notifications for urgent alerts
- Notification preferences and quiet hours
- Notification history and management

### Live Data Synchronization
- Real-time dashboard statistics
- Live message status updates
- Campaign progress tracking
- Lead assignment notifications
- Contact updates

## Setup

### 1. Install Dependencies

The WebSocket library is already installed:
```bash
npm install ws @types/ws
```

### 2. Initialize the System

For a custom server setup (recommended for production):

```typescript
// server.js or custom server
import { createServer } from 'http'
import next from 'next'
import { initializeRealTimeSystem } from './lib/websocket/init'

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res)
  })

  // Initialize WebSocket server
  initializeRealTimeSystem(server)

  server.listen(3000, () => {
    console.log('Server running on http://localhost:3000')
  })
})
```

For development with Next.js dev server:

```typescript
// pages/api/init-websocket.ts or similar
import { initializeRealTimeSystem } from '../../lib/websocket/init'

// Initialize without server instance (SSE fallback)
initializeRealTimeSystem()
```

### 3. Client-side Integration

#### Basic WebSocket Hook
```typescript
import { useWebSocket } from '../hooks/useWebSocket'

function MyComponent() {
  const { isConnected, send, subscribe } = useWebSocket()

  useEffect(() => {
    if (isConnected) {
      subscribe('user:123') // Subscribe to user-specific events
    }
  }, [isConnected, subscribe])

  return (
    <div>
      Status: {isConnected ? 'Connected' : 'Disconnected'}
    </div>
  )
}
```

#### Live Data Hooks
```typescript
import { useLiveStats, useLiveMessages } from '../hooks/useLiveData'

function Dashboard() {
  const { stats, loading, isConnected } = useLiveStats()
  
  return (
    <div>
      <h1>Dashboard {isConnected && '(Live)'}</h1>
      <p>Total Contacts: {stats?.totalContacts}</p>
    </div>
  )
}
```

#### Notification Center
```typescript
import NotificationCenter from '../components/NotificationCenter'
import NotificationToast from '../components/NotificationToast'

function Layout() {
  return (
    <div>
      <header>
        <NotificationCenter />
      </header>
      <main>
        {/* Your content */}
      </main>
      <NotificationToast />
    </div>
  )
}
```

## API Endpoints

### WebSocket Connection
- **URL**: `ws://localhost:3000/ws?token=<jwt_token>`
- **Authentication**: JWT token in query parameter or Authorization header
- **Protocol**: WebSocket with JSON message format

### HTTP Endpoints
- `GET /api/ws` - WebSocket server status and statistics
- `GET /api/notifications` - Get user notifications
- `POST /api/notifications` - Send notification (admin only)
- `PATCH /api/notifications/[id]` - Mark notification as read
- `DELETE /api/notifications/[id]` - Delete notification
- `POST /api/notifications/mark-all-read` - Mark all notifications as read
- `GET /api/notifications/preferences` - Get notification preferences
- `PUT /api/notifications/preferences` - Update notification preferences
- `GET /api/live-sync` - Get sync service status
- `POST /api/live-sync` - Trigger sync events
- `POST /api/live-sync/stats` - Trigger stats update

## Message Format

### Client to Server
```json
{
  "type": "PING" | "SUBSCRIBE" | "UNSUBSCRIBE" | "TYPING_START" | "TYPING_STOP",
  "data": {
    "room": "contact:123",
    "contactId": "123"
  },
  "timestamp": "2023-12-01T10:00:00Z"
}
```

### Server to Client
```json
{
  "type": "NOTIFICATION" | "MESSAGE_RECEIVED" | "STATS_UPDATE" | "CAMPAIGN_PROGRESS",
  "data": {
    // Event-specific data
  },
  "timestamp": "2023-12-01T10:00:00Z"
}
```

## Room Subscriptions

The system uses room-based subscriptions for targeted message delivery:

- `user:{userId}` - User-specific events
- `role:{role}` - Role-specific events (ADMIN, EMPLOYEE)
- `contact:{contactId}` - Contact-specific events (messages, updates)
- `campaign:{campaignId}` - Campaign-specific events
- `lead:{leadId}` - Lead-specific events

## Event Types

### Notification Events
- `NOTIFICATION` - General notifications with priority levels

### Message Events
- `MESSAGE_RECEIVED` - New message from contact
- `MESSAGE_SENT` - Message sent to contact
- `MESSAGE_STATUS_UPDATE` - Message delivery status change
- `TYPING_START` / `TYPING_STOP` - Typing indicators

### Campaign Events
- `CAMPAIGN_STARTED` - Campaign execution started
- `CAMPAIGN_PROGRESS` - Campaign progress update
- `CAMPAIGN_COMPLETED` - Campaign finished successfully
- `CAMPAIGN_FAILED` - Campaign execution failed

### Lead Events
- `LEAD_CREATED` - New lead created
- `LEAD_UPDATED` - Lead information updated
- `LEAD_ASSIGNED` - Lead assigned to user
- `LEAD_CONVERTED` - Lead converted to customer

### System Events
- `SYSTEM_ALERT` - System alerts and warnings
- `STATS_UPDATE` - Dashboard statistics update
- `CONTACT_UPDATED` - Contact information changed

## Error Handling

The system includes comprehensive error handling:

- **Connection Errors**: Automatic reconnection with exponential backoff
- **Message Errors**: Failed message delivery logging and retry
- **Authentication Errors**: Token validation and refresh
- **Server Errors**: Graceful degradation and fallback mechanisms

## Performance Considerations

- **Connection Pooling**: Efficient management of WebSocket connections
- **Message Batching**: Grouping of frequent updates to reduce overhead
- **Selective Updates**: Only sending relevant data to subscribed clients
- **Cleanup**: Automatic removal of stale connections and data

## Security

- **Authentication**: JWT token validation for all connections
- **Authorization**: Role-based access control for events
- **Rate Limiting**: Protection against message flooding
- **Input Validation**: Sanitization of all incoming messages

## Monitoring

The system provides monitoring capabilities:

- Connection statistics and health metrics
- Event delivery tracking and performance
- Error logging and alerting
- Real-time dashboard for system status

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check JWT token validity
   - Verify server is running and accessible
   - Check firewall and proxy settings

2. **No Real-time Updates**
   - Verify WebSocket connection status
   - Check room subscriptions
   - Ensure live sync service is running

3. **High Memory Usage**
   - Check for connection leaks
   - Verify cleanup intervals are working
   - Monitor notification storage limits

### Debug Mode

Enable debug logging:
```typescript
// Set environment variable
process.env.WEBSOCKET_DEBUG = 'true'

// Or use logger directly
Logger.setLevel('DEBUG')
```

## Future Enhancements

- **Clustering Support**: Multi-server WebSocket synchronization
- **Message Persistence**: Offline message queuing and delivery
- **Advanced Analytics**: Real-time usage and performance metrics
- **Mobile Push Notifications**: Integration with mobile notification services
- **Video/Audio Calls**: WebRTC integration for voice/video communication