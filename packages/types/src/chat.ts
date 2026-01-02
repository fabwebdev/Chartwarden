/**
 * Chat Type Definitions
 * Shared types for team chat system
 */

export type RoomType = 'direct' | 'group' | 'department' | 'patient_care';
export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline';
export type ParticipantRole = 'admin' | 'member' | 'moderator';

/**
 * Chat Room
 */
export interface ChatRoom {
  id: string;
  name: string | null;
  type: RoomType;
  description: string | null;
  patient_id: string | null;
  is_archived: boolean;
  is_active: boolean;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  archived_at: Date | null;
}

/**
 * Chat Message
 */
export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  is_edited: boolean;
  edited_at: Date | null;
  is_deleted: boolean;
  deleted_at: Date | null;
  reply_to_id: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Chat Participant
 */
export interface ChatParticipant {
  id: string;
  room_id: string;
  user_id: string;
  role: ParticipantRole;
  is_muted: boolean;
  last_read_at: Date | null;
  last_read_message_id: string | null;
  is_active: boolean;
  joined_at: Date;
  left_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * User Presence
 */
export interface UserPresence {
  id: string;
  user_id: string;
  status: PresenceStatus;
  status_message: string | null;
  socket_id: string | null;
  is_connected: boolean;
  last_seen_at: Date;
  last_active_at: Date;
  typing_in_room_id: string | null;
  user_agent: string | null;
  ip_address: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Presence History
 */
export interface PresenceHistory {
  id: string;
  user_id: string;
  old_status: PresenceStatus;
  new_status: PresenceStatus;
  socket_id: string | null;
  user_agent: string | null;
  ip_address: string | null;
  session_started_at: Date | null;
  session_ended_at: Date | null;
  created_at: Date;
}

// ============================================
// API Request/Response Types
// ============================================

/**
 * Create Room Request
 */
export interface CreateRoomRequest {
  name?: string;
  type?: RoomType;
  description?: string;
  patientId?: string;
  participantIds?: string[];
}

/**
 * Send Message Request
 */
export interface SendMessageRequest {
  content: string;
  replyToId?: string;
}

/**
 * Room with Statistics
 */
export interface RoomWithStats extends ChatRoom {
  participant_count: number;
  last_message_at: Date | null;
  unread_count?: number;
}

/**
 * Message with Sender Info
 */
export interface MessageWithSender extends ChatMessage {
  senderName?: string;
  senderAvatar?: string;
}

/**
 * Participant with User Info
 */
export interface ParticipantWithUser extends ChatParticipant {
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  presence?: UserPresence;
}

// ============================================
// Socket.IO Event Types
// ============================================

/**
 * Socket Events for Chat Namespace
 */
export interface ChatSocketEvents {
  // Client -> Server
  'join:conversation': (conversationId: string, callback?: (response: any) => void) => void;
  'leave:conversation': (conversationId: string, callback?: (response: any) => void) => void;
  'send:message': (data: { conversationId: string; content: string; replyToId?: string }, callback?: (response: any) => void) => void;
  'typing:start': (conversationId: string) => void;
  'typing:stop': (conversationId: string) => void;

  // Server -> Client
  'new:message': (message: MessageWithSender) => void;
  'user:joined': (data: { userId: string; userName: string; timestamp: number }) => void;
  'user:left': (data: { userId: string; timestamp: number }) => void;
  'user:typing': (data: { userId: string; userName: string; conversationId: string }) => void;
  'user:stopped_typing': (data: { userId: string; conversationId: string }) => void;
  'message:edited': (message: ChatMessage) => void;
  'message:deleted': (messageId: string) => void;
}

/**
 * Typing Indicator
 */
export interface TypingIndicator {
  userId: string;
  userName: string;
  conversationId: string;
  timestamp: number;
}

/**
 * Online Users
 */
export interface OnlineUser {
  userId: string;
  userName: string;
  status: PresenceStatus;
  statusMessage: string | null;
  lastSeenAt: Date;
}
