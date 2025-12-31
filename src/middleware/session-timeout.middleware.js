/**
 * Session Timeout Middleware
 * TICKET #013: HIPAA-compliant session timeout enforcement
 *
 * Implements:
 * - 15-minute idle timeout
 * - 8-hour absolute session timeout
 * - Automatic session destruction on timeout
 * - Audit logging of timeout events
 *
 * HIPAA Compliance: §164.312(a)(2)(iii) - Automatic Logoff
 */

import { db } from '../config/db.drizzle.js';
import { sessions } from '../db/schemas/index.js';
import { eq } from 'drizzle-orm';
import auth from '../config/betterAuth.js';

/**
 * Session timeout middleware for HIPAA compliance
 * Works with Better Auth session management
 * Enforces idle timeout and absolute timeout limits
 *
 * @param {Object} request - Fastify request object
 * @param {Object} reply - Fastify reply object
 * @returns {void|Response} - Returns 401 response if session expired
 */
export const sessionTimeoutMiddleware = async (request, reply) => {
    // Skip for public routes (no user or Better Auth session)
    if (!request.user || !request.betterAuthSession) {
        return;
    }

    const now = new Date();
    const sessionToken = request.cookies?.['better-auth.session_token'];

    if (!sessionToken) {
        return;
    }

    try {
        // Fetch session from database
        const sessionRecords = await db
            .select()
            .from(sessions)
            .where(eq(sessions.token, sessionToken))
            .limit(1);

        if (sessionRecords.length === 0) {
            // Session not found in database - already expired or invalid
            return reply.code(401).send({
                status: 401,
                error: 'Session Expired',
                message: 'Your session is invalid. Please log in again.',
                reason: 'session_not_found'
            });
        }

        const session = sessionRecords[0];

        // Check if session has expired (Better Auth handles this, but double-check)
        if (session.expiresAt && new Date(session.expiresAt) < now) {
            request.log.warn({
                userId: request.user.id,
                userEmail: request.user.email,
                ip: request.ip,
                path: request.url
            }, 'Session expired (database expiration)');

            return reply.code(401).send({
                status: 401,
                error: 'Session Expired',
                message: 'Your session has expired. Please log in again.',
                reason: 'session_expired'
            });
        }

        // Check idle timeout (15 minutes of inactivity)
        // Use updatedAt as last activity timestamp
        const lastActivity = new Date(session.updatedAt);
        const idleTime = now - lastActivity;
        const maxIdleTime = 15 * 60 * 1000; // 15 minutes in milliseconds

        if (idleTime > maxIdleTime) {
            // Log idle timeout event for audit trail
            request.log.warn({
                userId: request.user.id,
                userEmail: request.user.email,
                idleMinutes: Math.floor(idleTime / 1000 / 60),
                ip: request.ip,
                userAgent: request.headers['user-agent'],
                path: request.url
            }, 'Session expired due to inactivity');

            // Delete session from database
            await db.delete(sessions).where(eq(sessions.id, session.id));

            // Return 401 Unauthorized with detailed message
            return reply.code(401).send({
                status: 401,
                error: 'Session Expired',
                message: 'Your session has expired due to inactivity. Please log in again.',
                reason: 'idle_timeout',
                idleMinutes: Math.floor(idleTime / 1000 / 60)
            });
        }

        // Check absolute timeout (8 hours maximum session age)
        const sessionCreatedAt = new Date(session.createdAt);
        const sessionAge = now - sessionCreatedAt;
        const maxSessionAge = 8 * 60 * 60 * 1000; // 8 hours in milliseconds

        if (sessionAge > maxSessionAge) {
            // Log absolute timeout event for audit trail
            request.log.warn({
                userId: request.user.id,
                userEmail: request.user.email,
                sessionHours: Math.floor(sessionAge / 1000 / 60 / 60),
                ip: request.ip,
                userAgent: request.headers['user-agent'],
                path: request.url
            }, 'Session expired due to absolute timeout');

            // Delete session from database
            await db.delete(sessions).where(eq(sessions.id, session.id));

            // Return 401 Unauthorized with detailed message
            return reply.code(401).send({
                status: 401,
                error: 'Session Expired',
                message: 'Your session has expired. Maximum session duration is 8 hours. Please log in again.',
                reason: 'absolute_timeout',
                sessionHours: Math.floor(sessionAge / 1000 / 60 / 60)
            });
        }

        // Update session's updatedAt timestamp to track activity
        await db
            .update(sessions)
            .set({ updatedAt: now })
            .where(eq(sessions.id, session.id));

    } catch (error) {
        request.log.error({ error, userId: request.user?.id }, 'Error in session timeout middleware');
        // Don't block the request on middleware errors
        // Better Auth will handle session validation
    }
};

/**
 * Factory function to create the session timeout middleware
 * Can be customized with different timeout values if needed
 *
 * @param {Object} options - Configuration options
 * @param {number} options.idleTimeout - Idle timeout in milliseconds (default: 15 minutes)
 * @param {number} options.absoluteTimeout - Absolute timeout in milliseconds (default: 8 hours)
 * @returns {Function} - Middleware function
 */
export const createSessionTimeoutMiddleware = (options = {}) => {
    const {
        idleTimeout = 15 * 60 * 1000, // 15 minutes
        absoluteTimeout = 8 * 60 * 60 * 1000 // 8 hours
    } = options;

    return async (request, reply) => {
        // Skip for public routes
        if (!request.user || !request.session) {
            return;
        }

        const now = Date.now();
        const lastActivity = request.session.lastActivity || now;
        const idleTime = now - lastActivity;

        // Check idle timeout
        if (idleTime > idleTimeout) {
            request.log.warn({
                userId: request.user.id,
                idleTime: Math.floor(idleTime / 1000 / 60),
            }, 'Session idle timeout');

            try {
                if (typeof request.session.destroy === 'function') {
                    await request.session.destroy();
                }
            } catch (error) {
                request.log.error({ error }, 'Error destroying session');
            }

            return reply.code(401).send({
                status: 401,
                error: 'Session Expired',
                message: 'Your session has expired due to inactivity. Please log in again.',
                reason: 'idle_timeout'
            });
        }

        // Check absolute timeout
        const sessionCreatedAt = request.session.createdAt || now;
        const sessionAge = now - sessionCreatedAt;

        if (sessionAge > absoluteTimeout) {
            request.log.warn({
                userId: request.user.id,
                sessionAge: Math.floor(sessionAge / 1000 / 60 / 60),
            }, 'Session absolute timeout');

            try {
                if (typeof request.session.destroy === 'function') {
                    await request.session.destroy();
                }
            } catch (error) {
                request.log.error({ error }, 'Error destroying session');
            }

            return reply.code(401).send({
                status: 401,
                error: 'Session Expired',
                message: 'Your session has expired. Please log in again.',
                reason: 'absolute_timeout'
            });
        }

        // Update last activity
        request.session.lastActivity = now;
        if (!request.session.createdAt) {
            request.session.createdAt = now;
        }
    };
};

export default sessionTimeoutMiddleware;
