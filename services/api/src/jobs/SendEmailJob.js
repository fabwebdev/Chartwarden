import { logger } from '../utils/logger.js';
import MailService from '../services/MailService.js';
import { welcomeEmailHtml, welcomeEmailText } from '../templates/email/welcome.template.js';
import { passwordResetEmailHtml, passwordResetEmailText } from '../templates/email/password-reset.template.js';
import { notificationEmailHtml, notificationEmailText } from '../templates/email/notification.template.js';

/**
 * Generic email job handler
 * Sends emails using the configured mail transporter
 */
export const sendEmailJob = async (data) => {
    const { to, subject, body, html, text, template, templateData } = data;

    logger.info('Processing email job:', { to, subject });

    try {
        let emailHtml = html;
        let emailText = text || body;

        // If a template is specified, generate HTML/text from template
        if (template) {
            switch (template) {
                case 'welcome':
                    emailHtml = welcomeEmailHtml(templateData);
                    emailText = welcomeEmailText(templateData);
                    break;
                case 'password-reset':
                    emailHtml = passwordResetEmailHtml(templateData);
                    emailText = passwordResetEmailText(templateData);
                    break;
                case 'notification':
                    emailHtml = notificationEmailHtml(templateData);
                    emailText = notificationEmailText(templateData);
                    break;
                default:
                    logger.warn(`Unknown template: ${template}, using raw content`);
            }
        }

        const result = await MailService.send({
            to,
            subject,
            text: emailText,
            html: emailHtml
        });

        logger.info('Email sent successfully:', { to, subject, messageId: result.messageId });
        return { success: true, to, subject, messageId: result.messageId };
    } catch (error) {
        logger.error('Failed to send email:', { to, subject, error: error.message });
        throw error;
    }
};

/**
 * Password reset email job handler
 * Sends a password reset email with a secure reset link
 */
export const sendPasswordResetEmailJob = async (data) => {
    const { email, name, resetToken, expiresInMinutes = 60 } = data;

    logger.info('Sending password reset email to:', email);

    try {
        const appUrl = process.env.APP_URL || 'http://localhost:3000';
        const resetUrl = `${appUrl}/auth/reset-password?token=${resetToken}`;

        const templateData = {
            name: name || 'User',
            email,
            resetUrl,
            expiresInMinutes
        };

        const result = await MailService.send({
            to: email,
            subject: 'Reset Your Password - Chartwarden',
            text: passwordResetEmailText(templateData),
            html: passwordResetEmailHtml(templateData)
        });

        logger.info('Password reset email sent:', { email, messageId: result.messageId });
        return { success: true, email, messageId: result.messageId };
    } catch (error) {
        logger.error('Failed to send password reset email:', { email, error: error.message });
        throw error;
    }
};

/**
 * Welcome email job handler
 * Sends a welcome email to new users after registration
 */
export const sendWelcomeEmailJob = async (data) => {
    const { email, name } = data;

    logger.info('Sending welcome email to:', name, email);

    try {
        const templateData = {
            name: name || 'User',
            email,
            loginUrl: process.env.APP_URL || 'http://localhost:3000',
            supportEmail: process.env.SUPPORT_EMAIL || 'support@chartwarden.com'
        };

        const result = await MailService.send({
            to: email,
            subject: 'Welcome to Chartwarden',
            text: welcomeEmailText(templateData),
            html: welcomeEmailHtml(templateData)
        });

        logger.info('Welcome email sent:', { email, name, messageId: result.messageId });
        return { success: true, email, name, messageId: result.messageId };
    } catch (error) {
        logger.error('Failed to send welcome email:', { email, name, error: error.message });
        throw error;
    }
};

/**
 * General notification email job handler
 * Sends notification emails for various system events
 */
export const sendNotificationEmailJob = async (data) => {
    const { to, title, message, type = 'info', action, details, recipientName } = data;

    logger.info('Sending notification email:', { to, title });

    try {
        const templateData = {
            title,
            message,
            type,
            action,
            details,
            recipientName
        };

        const result = await MailService.send({
            to,
            subject: title,
            text: notificationEmailText(templateData),
            html: notificationEmailHtml(templateData)
        });

        logger.info('Notification email sent:', { to, title, messageId: result.messageId });
        return { success: true, to, title, messageId: result.messageId };
    } catch (error) {
        logger.error('Failed to send notification email:', { to, title, error: error.message });
        throw error;
    }
};
