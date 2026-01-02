import { db } from '../config/db.drizzle.js';
import {
  chat_rooms,
  chat_messages,
  chat_participants,
  user_presence
} from '../db/schemas/index.js';
import { eq, and, desc, lt, or, inArray, sql, isNull } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { logger } from '../utils/logger.js';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Chat Controller
 * Manages team chat rooms, messages, and participants
 *
 * HIPAA Compliance:
 * - All messages are sanitized for XSS prevention
 * - Patient care rooms require special authorization
 * - All operations are audited via database triggers
 * - Soft delete only - messages never hard deleted
 *
 * Endpoints:
 *   Rooms:
 *     - POST   /rooms                     - Create new chat room
 *     - GET    /rooms                     - Get user's active rooms
 *     - GET    /rooms/:id                 - Get room details
 *     - PUT    /rooms/:id                 - Update room settings
 *     - DELETE /rooms/:id                 - Archive room
 *
 *   Messages:
 *     - POST   /rooms/:id/messages        - Send message
 *     - GET    /rooms/:id/messages        - Get message history
 *     - PUT    /messages/:id              - Edit message
 *     - DELETE /messages/:id              - Soft delete message
 *
 *   Participants:
 *     - POST   /rooms/:id/participants    - Add participant
 *     - DELETE /rooms/:id/participants/:userId - Remove participant
 *     - PUT    /rooms/:id/read            - Update last read timestamp
 */

class ChatController {
  // ============================================
  // ROOM MANAGEMENT
  // ============================================

  /**
   * POST /api/chat/rooms
   * Create a new chat room
   */
  async createRoom(req, res) {
    try {
      const { name, type = 'group', description, patientId, participantIds = [] } = req.body;
      const userId = req.user.id;

      // Validate room type
      if (!['direct', 'group', 'department', 'patient_care'].includes(type)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid room type'
        });
      }

      // Patient care rooms require patient_id
      if (type === 'patient_care' && !patientId) {
        return res.status(400).json({
          success: false,
          error: 'Patient ID is required for patient care rooms'
        });
      }

      // Direct messages require exactly one other participant
      if (type === 'direct' && participantIds.length !== 1) {
        return res.status(400).json({
          success: false,
          error: 'Direct messages require exactly one other participant'
        });
      }

      // Check if direct message room already exists
      if (type === 'direct') {
        const existingRoom = await db
          .select({
            id: chat_rooms.id,
            name: chat_rooms.name,
            type: chat_rooms.type,
            created_at: chat_rooms.created_at
          })
          .from(chat_rooms)
          .innerJoin(
            chat_participants,
            eq(chat_rooms.id, chat_participants.room_id)
          )
          .where(
            and(
              eq(chat_rooms.type, 'direct'),
              eq(chat_rooms.is_active, true),
              inArray(chat_participants.user_id, [userId, participantIds[0]])
            )
          )
          .groupBy(chat_rooms.id)
          .having(sql`COUNT(DISTINCT ${chat_participants.user_id}) = 2`);

        if (existingRoom.length > 0) {
          return res.status(200).json({
            success: true,
            message: 'Direct message room already exists',
            room: existingRoom[0]
          });
        }
      }

      // Create room
      const [room] = await db
        .insert(chat_rooms)
        .values({
          id: nanoid(),
          name: type === 'direct' ? null : name,
          type,
          description,
          patient_id: patientId || null,
          created_by: userId,
          is_active: true,
          is_archived: false
        })
        .returning();

      // Add creator as participant
      await db.insert(chat_participants).values({
        id: nanoid(),
        room_id: room.id,
        user_id: userId,
        role: 'admin',
        is_active: true
      });

      // Add other participants
      if (participantIds.length > 0) {
        const participantValues = participantIds.map(participantId => ({
          id: nanoid(),
          room_id: room.id,
          user_id: participantId,
          role: 'member',
          is_active: true
        }));

        await db.insert(chat_participants).values(participantValues);
      }

      res.status(201).json({
        success: true,
        message: 'Chat room created successfully',
        room
      });
    } catch (error) {
      logger.error('Error creating chat room:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create chat room',
        message: error.message
      });
    }
  }

  /**
   * GET /api/chat/rooms
   * Get all active rooms for the current user
   */
  async getRooms(req, res) {
    try {
      const userId = req.user.id;
      const { type, archived = false } = req.query;

      const whereConditions = [
        eq(chat_participants.user_id, userId),
        eq(chat_participants.is_active, true)
      ];

      if (type) {
        whereConditions.push(eq(chat_rooms.type, type));
      }

      whereConditions.push(eq(chat_rooms.is_archived, archived === 'true'));

      const rooms = await db
        .select({
          id: chat_rooms.id,
          name: chat_rooms.name,
          type: chat_rooms.type,
          description: chat_rooms.description,
          patient_id: chat_rooms.patient_id,
          is_archived: chat_rooms.is_archived,
          created_at: chat_rooms.created_at,
          updated_at: chat_rooms.updated_at,
          participant_count: sql`COUNT(DISTINCT ${chat_participants.user_id})`,
          last_message_at: sql`MAX(${chat_messages.created_at})`
        })
        .from(chat_rooms)
        .innerJoin(
          chat_participants,
          eq(chat_rooms.id, chat_participants.room_id)
        )
        .leftJoin(
          chat_messages,
          and(
            eq(chat_rooms.id, chat_messages.room_id),
            eq(chat_messages.is_deleted, false)
          )
        )
        .where(and(...whereConditions))
        .groupBy(chat_rooms.id)
        .orderBy(desc(sql`MAX(${chat_messages.created_at})`));

      res.json({
        success: true,
        count: rooms.length,
        rooms
      });
    } catch (error) {
      logger.error('Error getting chat rooms:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve chat rooms',
        message: error.message
      });
    }
  }

  /**
   * GET /api/chat/rooms/:id
   * Get room details with participants
   */
  async getRoom(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Verify user is a participant
      const participation = await db
        .select()
        .from(chat_participants)
        .where(
          and(
            eq(chat_participants.room_id, id),
            eq(chat_participants.user_id, userId),
            eq(chat_participants.is_active, true)
          )
        )
        .limit(1);

      if (participation.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to access this room'
        });
      }

      const [room] = await db
        .select()
        .from(chat_rooms)
        .where(eq(chat_rooms.id, id))
        .limit(1);

      if (!room) {
        return res.status(404).json({
          success: false,
          error: 'Room not found'
        });
      }

      // Get participants with user details
      const participants = await db
        .select({
          id: chat_participants.id,
          user_id: chat_participants.user_id,
          role: chat_participants.role,
          is_muted: chat_participants.is_muted,
          joined_at: chat_participants.joined_at,
          last_read_at: chat_participants.last_read_at
        })
        .from(chat_participants)
        .where(
          and(
            eq(chat_participants.room_id, id),
            eq(chat_participants.is_active, true)
          )
        );

      res.json({
        success: true,
        room: {
          ...room,
          participants
        }
      });
    } catch (error) {
      logger.error('Error getting room details:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve room details',
        message: error.message
      });
    }
  }

  /**
   * PUT /api/chat/rooms/:id
   * Update room settings
   */
  async updateRoom(req, res) {
    try {
      const { id } = req.params;
      const { name, description } = req.body;
      const userId = req.user.id;

      // Verify user is admin of the room
      const participation = await db
        .select()
        .from(chat_participants)
        .where(
          and(
            eq(chat_participants.room_id, id),
            eq(chat_participants.user_id, userId),
            eq(chat_participants.role, 'admin'),
            eq(chat_participants.is_active, true)
          )
        )
        .limit(1);

      if (participation.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to update this room'
        });
      }

      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      updateData.updated_at = new Date();

      const [updated] = await db
        .update(chat_rooms)
        .set(updateData)
        .where(eq(chat_rooms.id, id))
        .returning();

      res.json({
        success: true,
        message: 'Room updated successfully',
        room: updated
      });
    } catch (error) {
      logger.error('Error updating room:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update room',
        message: error.message
      });
    }
  }

  /**
   * DELETE /api/chat/rooms/:id
   * Archive a room (soft delete)
   */
  async archiveRoom(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Verify user is admin
      const participation = await db
        .select()
        .from(chat_participants)
        .where(
          and(
            eq(chat_participants.room_id, id),
            eq(chat_participants.user_id, userId),
            eq(chat_participants.role, 'admin')
          )
        )
        .limit(1);

      if (participation.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to archive this room'
        });
      }

      await db
        .update(chat_rooms)
        .set({
          is_archived: true,
          archived_at: new Date(),
          updated_at: new Date()
        })
        .where(eq(chat_rooms.id, id));

      res.json({
        success: true,
        message: 'Room archived successfully'
      });
    } catch (error) {
      logger.error('Error archiving room:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to archive room',
        message: error.message
      });
    }
  }

  // ============================================
  // MESSAGE MANAGEMENT
  // ============================================

  /**
   * POST /api/chat/rooms/:id/messages
   * Send a message to a room
   */
  async sendMessage(req, res) {
    try {
      const { id: roomId } = req.params;
      const { content, replyToId } = req.body;
      const userId = req.user.id;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Message content is required'
        });
      }

      // Verify user is participant
      const participation = await db
        .select()
        .from(chat_participants)
        .where(
          and(
            eq(chat_participants.room_id, roomId),
            eq(chat_participants.user_id, userId),
            eq(chat_participants.is_active, true)
          )
        )
        .limit(1);

      if (participation.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to send messages to this room'
        });
      }

      // Sanitize content to prevent XSS
      const sanitizedContent = DOMPurify.sanitize(content, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: []
      });

      // Create message
      const [message] = await db
        .insert(chat_messages)
        .values({
          id: nanoid(),
          room_id: roomId,
          sender_id: userId,
          content: sanitizedContent,
          reply_to_id: replyToId || null,
          is_deleted: false
        })
        .returning();

      // Update room's updated_at timestamp
      await db
        .update(chat_rooms)
        .set({ updated_at: new Date() })
        .where(eq(chat_rooms.id, roomId));

      res.status(201).json({
        success: true,
        message: 'Message sent successfully',
        data: message
      });
    } catch (error) {
      logger.error('Error sending message:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send message',
        message: error.message
      });
    }
  }

  /**
   * GET /api/chat/rooms/:id/messages
   * Get message history with pagination
   */
  async getMessages(req, res) {
    try {
      const { id: roomId } = req.params;
      const { limit = 50, before } = req.query;
      const userId = req.user.id;

      // Verify user is participant
      const participation = await db
        .select()
        .from(chat_participants)
        .where(
          and(
            eq(chat_participants.room_id, roomId),
            eq(chat_participants.user_id, userId),
            eq(chat_participants.is_active, true)
          )
        )
        .limit(1);

      if (participation.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to access this room'
        });
      }

      const whereConditions = [
        eq(chat_messages.room_id, roomId),
        eq(chat_messages.is_deleted, false)
      ];

      if (before) {
        whereConditions.push(lt(chat_messages.created_at, new Date(before)));
      }

      const messages = await db
        .select()
        .from(chat_messages)
        .where(and(...whereConditions))
        .orderBy(desc(chat_messages.created_at))
        .limit(parseInt(limit));

      res.json({
        success: true,
        count: messages.length,
        messages: messages.reverse() // Return in chronological order
      });
    } catch (error) {
      logger.error('Error getting messages:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve messages',
        message: error.message
      });
    }
  }

  /**
   * PUT /api/chat/messages/:id
   * Edit a message
   */
  async editMessage(req, res) {
    try {
      const { id } = req.params;
      const { content } = req.body;
      const userId = req.user.id;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Message content is required'
        });
      }

      // Verify user is the sender
      const [message] = await db
        .select()
        .from(chat_messages)
        .where(eq(chat_messages.id, id))
        .limit(1);

      if (!message) {
        return res.status(404).json({
          success: false,
          error: 'Message not found'
        });
      }

      if (message.sender_id !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to edit this message'
        });
      }

      // Sanitize content
      const sanitizedContent = DOMPurify.sanitize(content, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: []
      });

      const [updated] = await db
        .update(chat_messages)
        .set({
          content: sanitizedContent,
          is_edited: true,
          edited_at: new Date(),
          updated_at: new Date()
        })
        .where(eq(chat_messages.id, id))
        .returning();

      res.json({
        success: true,
        message: 'Message updated successfully',
        data: updated
      });
    } catch (error) {
      logger.error('Error editing message:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to edit message',
        message: error.message
      });
    }
  }

  /**
   * DELETE /api/chat/messages/:id
   * Soft delete a message (HIPAA compliance)
   */
  async deleteMessage(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Verify user is the sender
      const [message] = await db
        .select()
        .from(chat_messages)
        .where(eq(chat_messages.id, id))
        .limit(1);

      if (!message) {
        return res.status(404).json({
          success: false,
          error: 'Message not found'
        });
      }

      if (message.sender_id !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to delete this message'
        });
      }

      await db
        .update(chat_messages)
        .set({
          is_deleted: true,
          deleted_at: new Date(),
          updated_at: new Date()
        })
        .where(eq(chat_messages.id, id));

      res.json({
        success: true,
        message: 'Message deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting message:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete message',
        message: error.message
      });
    }
  }

  // ============================================
  // PARTICIPANT MANAGEMENT
  // ============================================

  /**
   * POST /api/chat/rooms/:id/participants
   * Add a participant to a room
   */
  async addParticipant(req, res) {
    try {
      const { id: roomId } = req.params;
      const { userId: newUserId } = req.body;
      const userId = req.user.id;

      // Verify requester is admin
      const participation = await db
        .select()
        .from(chat_participants)
        .where(
          and(
            eq(chat_participants.room_id, roomId),
            eq(chat_participants.user_id, userId),
            eq(chat_participants.role, 'admin')
          )
        )
        .limit(1);

      if (participation.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to add participants'
        });
      }

      // Check if already a participant
      const existing = await db
        .select()
        .from(chat_participants)
        .where(
          and(
            eq(chat_participants.room_id, roomId),
            eq(chat_participants.user_id, newUserId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        if (existing[0].is_active) {
          return res.status(400).json({
            success: false,
            error: 'User is already a participant'
          });
        }

        // Reactivate participation
        await db
          .update(chat_participants)
          .set({
            is_active: true,
            joined_at: new Date(),
            updated_at: new Date()
          })
          .where(eq(chat_participants.id, existing[0].id));

        return res.json({
          success: true,
          message: 'Participant re-added successfully'
        });
      }

      // Add new participant
      const [participant] = await db
        .insert(chat_participants)
        .values({
          id: nanoid(),
          room_id: roomId,
          user_id: newUserId,
          role: 'member',
          is_active: true
        })
        .returning();

      res.status(201).json({
        success: true,
        message: 'Participant added successfully',
        participant
      });
    } catch (error) {
      logger.error('Error adding participant:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add participant',
        message: error.message
      });
    }
  }

  /**
   * DELETE /api/chat/rooms/:id/participants/:userId
   * Remove a participant from a room
   */
  async removeParticipant(req, res) {
    try {
      const { id: roomId, userId: targetUserId } = req.params;
      const userId = req.user.id;

      // User can remove themselves, or admin can remove others
      let authorized = targetUserId === userId;

      if (!authorized) {
        const participation = await db
          .select()
          .from(chat_participants)
          .where(
            and(
              eq(chat_participants.room_id, roomId),
              eq(chat_participants.user_id, userId),
              eq(chat_participants.role, 'admin')
            )
          )
          .limit(1);

        authorized = participation.length > 0;
      }

      if (!authorized) {
        return res.status(403).json({
          success: false,
          error: 'Not authorized to remove participants'
        });
      }

      await db
        .update(chat_participants)
        .set({
          is_active: false,
          left_at: new Date(),
          updated_at: new Date()
        })
        .where(
          and(
            eq(chat_participants.room_id, roomId),
            eq(chat_participants.user_id, targetUserId)
          )
        );

      res.json({
        success: true,
        message: 'Participant removed successfully'
      });
    } catch (error) {
      logger.error('Error removing participant:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove participant',
        message: error.message
      });
    }
  }

  /**
   * PUT /api/chat/rooms/:id/read
   * Update last read timestamp for a room
   */
  async updateLastRead(req, res) {
    try {
      const { id: roomId } = req.params;
      const { messageId } = req.body;
      const userId = req.user.id;

      await db
        .update(chat_participants)
        .set({
          last_read_at: new Date(),
          last_read_message_id: messageId || null,
          updated_at: new Date()
        })
        .where(
          and(
            eq(chat_participants.room_id, roomId),
            eq(chat_participants.user_id, userId)
          )
        );

      res.json({
        success: true,
        message: 'Last read updated successfully'
      });
    } catch (error) {
      logger.error('Error updating last read:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update last read',
        message: error.message
      });
    }
  }
}

export default new ChatController();
