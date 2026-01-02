import ChatController from '../controllers/Chat.controller.js';
import { authenticate } from '../middleware/betterAuth.middleware.js';
import rateLimit from '@fastify/rate-limit';

/**
 * Chat Routes
 * Real-time team chat with message persistence and presence tracking
 *
 * All routes require authentication
 * Rate limiting applied to prevent message spam
 */
export default async function chatRoutes(fastify, options) {
  // Apply authentication middleware to all routes
  fastify.addHook('onRequest', authenticate);

  // ============================================
  // ROOM MANAGEMENT ENDPOINTS
  // ============================================

  /**
   * 1. Create new chat room
   * POST /api/chat/rooms
   */
  fastify.post(
    '/rooms',
    {
      schema: {
        description: 'Create a new chat room',
        tags: ['Chat'],
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Room name (optional for direct messages)' },
            type: {
              type: 'string',
              enum: ['direct', 'group', 'department', 'patient_care'],
              default: 'group',
              description: 'Room type'
            },
            description: { type: 'string', description: 'Room description' },
            patientId: { type: 'string', description: 'Patient ID (required for patient_care rooms)' },
            participantIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of user IDs to add as participants'
            }
          }
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              room: { type: 'object' }
            }
          }
        }
      }
    },
    ChatController.createRoom.bind(ChatController)
  );

  /**
   * 2. Get all rooms for current user
   * GET /api/chat/rooms
   */
  fastify.get(
    '/rooms',
    {
      schema: {
        description: 'Get all active chat rooms for the current user',
        tags: ['Chat'],
        querystring: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['direct', 'group', 'department', 'patient_care'] },
            archived: { type: 'string', enum: ['true', 'false'], default: 'false' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              count: { type: 'number' },
              rooms: { type: 'array' }
            }
          }
        }
      }
    },
    ChatController.getRooms.bind(ChatController)
  );

  /**
   * 3. Get room details
   * GET /api/chat/rooms/:id
   */
  fastify.get(
    '/rooms/:id',
    {
      schema: {
        description: 'Get chat room details with participants',
        tags: ['Chat'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', description: 'Room ID' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              room: { type: 'object' }
            }
          }
        }
      }
    },
    ChatController.getRoom.bind(ChatController)
  );

  /**
   * 4. Update room settings
   * PUT /api/chat/rooms/:id
   */
  fastify.put(
    '/rooms/:id',
    {
      schema: {
        description: 'Update chat room settings',
        tags: ['Chat'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', description: 'Room ID' }
          }
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Room name' },
            description: { type: 'string', description: 'Room description' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              room: { type: 'object' }
            }
          }
        }
      }
    },
    ChatController.updateRoom.bind(ChatController)
  );

  /**
   * 5. Archive a room
   * DELETE /api/chat/rooms/:id
   */
  fastify.delete(
    '/rooms/:id',
    {
      schema: {
        description: 'Archive a chat room (soft delete)',
        tags: ['Chat'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', description: 'Room ID' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' }
            }
          }
        }
      }
    },
    ChatController.archiveRoom.bind(ChatController)
  );

  // ============================================
  // MESSAGE MANAGEMENT ENDPOINTS
  // ============================================

  /**
   * 6. Send a message
   * POST /api/chat/rooms/:id/messages
   * Rate limited to prevent spam
   */
  fastify.post(
    '/rooms/:id/messages',
    {
      config: {
        rateLimit: {
          max: 30, // Max 30 messages
          timeWindow: '1 minute' // Per minute
        }
      },
      schema: {
        description: 'Send a message to a chat room',
        tags: ['Chat'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', description: 'Room ID' }
          }
        },
        body: {
          type: 'object',
          required: ['content'],
          properties: {
            content: { type: 'string', description: 'Message content' },
            replyToId: { type: 'string', description: 'ID of message being replied to' }
          }
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: { type: 'object' }
            }
          }
        }
      }
    },
    ChatController.sendMessage.bind(ChatController)
  );

  /**
   * 7. Get message history
   * GET /api/chat/rooms/:id/messages
   */
  fastify.get(
    '/rooms/:id/messages',
    {
      schema: {
        description: 'Get message history for a chat room with pagination',
        tags: ['Chat'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', description: 'Room ID' }
          }
        },
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', default: 50, description: 'Number of messages to retrieve' },
            before: { type: 'string', description: 'ISO timestamp - get messages before this time' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              count: { type: 'number' },
              messages: { type: 'array' }
            }
          }
        }
      }
    },
    ChatController.getMessages.bind(ChatController)
  );

  /**
   * 8. Edit a message
   * PUT /api/chat/messages/:id
   */
  fastify.put(
    '/messages/:id',
    {
      schema: {
        description: 'Edit a message',
        tags: ['Chat'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', description: 'Message ID' }
          }
        },
        body: {
          type: 'object',
          required: ['content'],
          properties: {
            content: { type: 'string', description: 'Updated message content' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: { type: 'object' }
            }
          }
        }
      }
    },
    ChatController.editMessage.bind(ChatController)
  );

  /**
   * 9. Delete a message
   * DELETE /api/chat/messages/:id
   */
  fastify.delete(
    '/messages/:id',
    {
      schema: {
        description: 'Delete a message (soft delete)',
        tags: ['Chat'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', description: 'Message ID' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' }
            }
          }
        }
      }
    },
    ChatController.deleteMessage.bind(ChatController)
  );

  // ============================================
  // PARTICIPANT MANAGEMENT ENDPOINTS
  // ============================================

  /**
   * 10. Add participant to room
   * POST /api/chat/rooms/:id/participants
   */
  fastify.post(
    '/rooms/:id/participants',
    {
      schema: {
        description: 'Add a participant to a chat room',
        tags: ['Chat'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', description: 'Room ID' }
          }
        },
        body: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: { type: 'string', description: 'User ID to add' }
          }
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              participant: { type: 'object' }
            }
          }
        }
      }
    },
    ChatController.addParticipant.bind(ChatController)
  );

  /**
   * 11. Remove participant from room
   * DELETE /api/chat/rooms/:id/participants/:userId
   */
  fastify.delete(
    '/rooms/:id/participants/:userId',
    {
      schema: {
        description: 'Remove a participant from a chat room',
        tags: ['Chat'],
        params: {
          type: 'object',
          required: ['id', 'userId'],
          properties: {
            id: { type: 'string', description: 'Room ID' },
            userId: { type: 'string', description: 'User ID to remove' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' }
            }
          }
        }
      }
    },
    ChatController.removeParticipant.bind(ChatController)
  );

  /**
   * 12. Update last read timestamp
   * PUT /api/chat/rooms/:id/read
   */
  fastify.put(
    '/rooms/:id/read',
    {
      schema: {
        description: 'Update last read timestamp for a room',
        tags: ['Chat'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', description: 'Room ID' }
          }
        },
        body: {
          type: 'object',
          properties: {
            messageId: { type: 'string', description: 'Last read message ID' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' }
            }
          }
        }
      }
    },
    ChatController.updateLastRead.bind(ChatController)
  );
}
