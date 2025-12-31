import { logger } from '../utils/logger.js';

/**
 * Example job handler for sending emails
 * This demonstrates the secure job pattern (no eval!)
 */

export const sendEmailJob = async (data) => {
    const { to, subject, body } = data;

    // TODO: Implement actual email sending logic
    // For now, just log the email
    logger.info('Sending email:', { to, subject, body })

    // Simulate email sending
    await new Promise(resolve => setTimeout(resolve, 100));

    return { success: true, to, subject };
};

export const sendPasswordResetEmailJob = async (data) => {
    const { email, resetToken } = data;

    // TODO: Implement password reset email
    logger.info('Sending password reset email to:', email)

    return { success: true, email };
};

export const sendWelcomeEmailJob = async (data) => {
    const { email, name } = data;

    // TODO: Implement welcome email
    logger.info('Sending welcome email to:', name, email)

    return { success: true, email, name };
};
