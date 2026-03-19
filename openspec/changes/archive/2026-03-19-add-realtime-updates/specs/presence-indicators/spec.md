## ADDED Requirements

### Requirement: Presence Channel
The system SHALL provide presence channels for tracking users viewing a board.

**Presence Channel:** `presence-tenant.{tenantId}.board.{boardId}`

#### Scenario: Join presence channel
- **WHEN** a user opens a board
- **THEN** they join the presence channel
- **AND** other users are notified of their presence

#### Scenario: Leave presence channel
- **WHEN** a user navigates away from a board
- **THEN** they leave the presence channel
- **AND** other users are notified of their departure

#### Scenario: Presence data structure
- **WHEN** a user joins a presence channel
- **THEN** their presence data includes:
  - User ID
  - Name
  - Avatar URL
  - Joined timestamp

**Presence Data:**
```json
{
  "id": "user-uuid",
  "name": "John Doe",
  "avatar": "https://...",
  "joined_at": "2024-01-15T10:00:00Z"
}
```

---

### Requirement: Presence Events
The system SHALL broadcast presence events when users join or leave.

| Event | Trigger |
|-------|---------|
| here | Initial list of present users |
| joining | New user joined |
| leaving | User left |

#### Scenario: Receive initial presence
- **WHEN** a user joins a presence channel
- **THEN** they receive a "here" event with all current users

#### Scenario: User joining notification
- **WHEN** a new user joins the board
- **THEN** existing users receive a "joining" event
- **AND** the new user is added to their presence list

#### Scenario: User leaving notification
- **WHEN** a user leaves the board
- **THEN** remaining users receive a "leaving" event
- **AND** the user is removed from their presence list

---

### Requirement: Presence Timeout
The system SHALL handle inactive users and disconnections gracefully.

#### Scenario: Heartbeat mechanism
- **WHEN** a user is connected to presence channel
- **THEN** a heartbeat is sent every 30 seconds
- **AND** confirms user is still active

#### Scenario: User timeout
- **WHEN** no heartbeat received for 60 seconds
- **THEN** user is considered disconnected
- **AND** "leaving" event is broadcast

#### Scenario: Tab visibility handling
- **WHEN** browser tab becomes hidden
- **THEN** user remains in presence for 2 minutes
- **THEN** is removed if tab still hidden

---

### Requirement: Board Presence Component
The Angular application SHALL provide a BoardPresenceComponent displaying active users.

#### Scenario: Display user avatars
- **WHEN** viewing a board with other active users
- **THEN** avatars of viewing users are displayed
- **AND** shown in the board header area

#### Scenario: Avatar limit with overflow
- **WHEN** more than 5 users are viewing
- **THEN** first 5 avatars are shown
- **AND** "+X more" indicator shows remaining count

#### Scenario: Hover for user name
- **WHEN** hovering over a user avatar
- **THEN** a tooltip shows the user's full name

#### Scenario: Animate user changes
- **WHEN** a user joins
- **THEN** their avatar slides in with animation
- **WHEN** a user leaves
- **THEN** their avatar fades out smoothly

---

### Requirement: Angular Presence Service
The Angular application SHALL provide a PresenceService for managing presence state.

```typescript
interface IPresenceService {
  joinBoard(boardId: string): void;
  leaveBoard(boardId: string): void;
  getBoardPresence(boardId: string): Observable<IPresenceUser[]>;
}

interface IPresenceUser {
  id: string;
  name: string;
  avatar: string;
  joinedAt: Date;
  isIdle: boolean;
}
```

#### Scenario: PresenceService methods
- **WHEN** the service is used
- **THEN** it provides:
  - joinBoard(boardId): Subscribe to presence channel
  - leaveBoard(boardId): Unsubscribe from presence channel
  - getBoardPresence(boardId): Observable of current users
  - getCurrentUserPresence(): User's own presence state

#### Scenario: Track idle state
- **WHEN** user has not interacted for 5 minutes
- **THEN** their presence state shows as "idle"
- **AND** avatar may be dimmed or show idle indicator

---

### Requirement: Presence Configuration
The system SHALL allow configuration of presence behavior.

**Configuration Options:**
| Setting | Default | Description |
|---------|---------|-------------|
| presence_enabled | true | Enable presence feature |
| heartbeat_interval | 30s | How often to ping |
| idle_timeout | 300s | Time before marking idle |
| removal_timeout | 60s | Time before removing disconnected |

#### Scenario: Disable presence per tenant
- **WHEN** tenant has presence disabled
- **THEN** presence channels are not used
- **AND** no avatars appear in UI

---

### Requirement: Presence with Polling Fallback
The Angular application SHALL support presence tracking even in polling mode.

#### Scenario: Polling presence endpoint
- **WHEN** WebSocket is unavailable
- **THEN** presence is tracked via REST polling

**Polling Endpoint:**
```
GET /api/boards/{board}/presence
```

**Response:**
```json
{
  "users": [
    {"id": "...", "name": "John", "avatar": "...", "last_seen": "..."},
    {"id": "...", "name": "Jane", "avatar": "...", "last_seen": "..."}
  ]
}
```

#### Scenario: Update own presence
- **WHEN** in polling mode
- **THEN** client POSTs heartbeat every 30 seconds

```
POST /api/boards/{board}/presence/heartbeat
```

---

### Requirement: Presence Privacy
The system SHALL respect user privacy preferences for presence.

#### Scenario: User opts out of presence
- **WHEN** a user has "show presence" disabled in settings
- **THEN** they do not appear in presence lists
- **AND** they still receive presence updates about others

#### Scenario: Presence visible setting
- **WHEN** checking user settings
- **THEN** presence visibility preference is respected
