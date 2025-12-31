/**
 * Email Routes
 * API endpoints for email testing and management
 */

import { authenticate } from '../middleware/betterAuth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { ROLES } from '../config/rbac.js';
import MailService from '../services/MailService.js';
import Mail from '../facades/Mail.js';
import { logger } from '../utils/logger.js';
import {
  welcomeEmailHtml,
  welcomeEmailText
} from '../templates/email/welcome.template.js';
import {
  passwordResetEmailHtml,
  passwordResetEmailText
} from '../templates/email/password-reset.template.js';
import {
  notificationEmailHtml,
  notificationEmailText
} from '../templates/email/notification.template.js';

async function emailRoutes(fastify, options) {
  /**
   * Verify mail configuration
   * GET /api/email/verify
   * Admin only
   */
  fastify.get(
    '/verify',
    {
      preHandler: [authenticate, requireRole(ROLES.ADMIN)]
    },
    async (request, reply) => {
      try {
        const isValid = await Mail.verify();

        return {
          status: 200,
          message: isValid
            ? 'Mail transporter verified successfully'
            : 'Mail transporter verification failed',
          data: {
            verified: isValid,
            mailer: process.env.MAIL_MAILER || 'smtp',
            host: process.env.MAIL_HOST || 'not configured',
            port: process.env.MAIL_PORT || 'not configured',
            fromAddress: process.env.MAIL_FROM_ADDRESS || 'not configured'
          }
        };
      } catch (error) {
        logger.error('Mail verification error:', error);
        return reply.code(500).send({
          status: 500,
          message: 'Failed to verify mail configuration',
          error: error.message
        });
      }
    }
  );

  /**
   * Send a test email
   * POST /api/email/test
   * Admin only
   * Body: { to: string, template?: 'welcome' | 'password-reset' | 'notification' }
   */
  fastify.post(
    '/test',
    {
      preHandler: [authenticate, requireRole(ROLES.ADMIN)],
      schema: {
        body: {
          type: 'object',
          required: ['to'],
          properties: {
            to: { type: 'string', format: 'email' },
            template: {
              type: 'string',
              enum: ['welcome', 'password-reset', 'notification'],
              default: 'notification'
            }
          }
        }
      }
    },
    async (request, reply) => {
      try {
        const { to, template = 'notification' } = request.body;
        const testData = {
          name: 'Test User',
          email: to,
          loginUrl: process.env.APP_URL || 'http://localhost:3000',
          supportEmail: process.env.SUPPORT_EMAIL || 'support@chartwarden.com',
          resetUrl: `${process.env.APP_URL || 'http://localhost:3000'}/auth/reset-password?token=test-token`,
          expiresInMinutes: 60,
          title: 'Test Notification',
          message: 'This is a test notification email from Chartwarden. If you received this email, the email system is working correctly.',
          type: 'info',
          recipientName: 'Test User'
        };

        let subject, html, text;

        switch (template) {
          case 'welcome':
            subject = 'Test: Welcome to Chartwarden';
            html = welcomeEmailHtml(testData);
            text = welcomeEmailText(testData);
            break;
          case 'password-reset':
            subject = 'Test: Password Reset Request';
            html = passwordResetEmailHtml(testData);
            text = passwordResetEmailText(testData);
            break;
          case 'notification':
          default:
            subject = 'Test: Chartwarden Notification';
            html = notificationEmailHtml(testData);
            text = notificationEmailText(testData);
            break;
        }

        const result = await Mail.send({
          to,
          subject,
          html,
          text
        });

        logger.info('Test email sent:', { to, template, messageId: result.messageId });

        return {
          status: 200,
          message: 'Test email sent successfully',
          data: {
            to,
            template,
            messageId: result.messageId
          }
        };
      } catch (error) {
        logger.error('Test email error:', error);
        return reply.code(500).send({
          status: 500,
          message: 'Failed to send test email',
          error: error.message
        });
      }
    }
  );

  /**
   * Preview email template (returns HTML)
   * GET /api/email/preview/:template
   * Admin only
   */
  fastify.get(
    '/preview/:template',
    {
      preHandler: [authenticate, requireRole(ROLES.ADMIN)],
      schema: {
        params: {
          type: 'object',
          required: ['template'],
          properties: {
            template: {
              type: 'string',
              enum: ['welcome', 'password-reset', 'notification']
            }
          }
        }
      }
    },
    async (request, reply) => {
      try {
        const { template } = request.params;
        const sampleData = {
          name: 'John Doe',
          email: 'john.doe@example.com',
          loginUrl: 'http://localhost:3000',
          supportEmail: 'support@chartwarden.com',
          resetUrl: 'http://localhost:3000/auth/reset-password?token=sample-token-12345',
          expiresInMinutes: 60,
          title: 'Sample Notification',
          message: 'This is a sample notification message for preview purposes.',
          type: 'info',
          recipientName: 'John Doe',
          action: {
            text: 'View Details',
            url: 'http://localhost:3000/details'
          },
          details: [
            { label: 'Patient', value: 'Jane Smith' },
            { label: 'MRN', value: '123456' },
            { label: 'Date', value: new Date().toLocaleDateString() }
          ]
        };

        let html;

        switch (template) {
          case 'welcome':
            html = welcomeEmailHtml(sampleData);
            break;
          case 'password-reset':
            html = passwordResetEmailHtml(sampleData);
            break;
          case 'notification':
          default:
            html = notificationEmailHtml(sampleData);
            break;
        }

        reply.type('text/html');
        return html;
      } catch (error) {
        logger.error('Template preview error:', error);
        return reply.code(500).send({
          status: 500,
          message: 'Failed to generate template preview',
          error: error.message
        });
      }
    }
  );

  /**
   * Get mail configuration status
   * GET /api/email/config
   * Admin only
   */
  fastify.get(
    '/config',
    {
      preHandler: [authenticate, requireRole(ROLES.ADMIN)]
    },
    async (request, reply) => {
      try {
        return {
          status: 200,
          message: 'Mail configuration retrieved',
          data: {
            mailer: process.env.MAIL_MAILER || 'smtp',
            host: process.env.MAIL_HOST || 'not configured',
            port: process.env.MAIL_PORT || 587,
            encryption: process.env.MAIL_ENCRYPTION || 'tls',
            fromAddress: process.env.MAIL_FROM_ADDRESS || 'not configured',
            fromName: process.env.MAIL_FROM_NAME || 'not configured',
            // Don't expose credentials, just show if they're set
            hasUsername: !!process.env.MAIL_USERNAME,
            hasPassword: !!process.env.MAIL_PASSWORD
          }
        };
      } catch (error) {
        logger.error('Config retrieval error:', error);
        return reply.code(500).send({
          status: 500,
          message: 'Failed to retrieve mail configuration',
          error: error.message
        });
      }
    }
  );
}

export default emailRoutes;
