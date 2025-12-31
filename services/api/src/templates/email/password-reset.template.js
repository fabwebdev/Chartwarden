/**
 * Password Reset Email Template
 * Sent when users request a password reset
 */

import { baseTemplate, buttonComponent, alertComponent } from './base.template.js';

/**
 * Generate password reset email HTML
 * @param {Object} data - Template data
 * @param {string} data.name - User's name
 * @param {string} data.email - User's email
 * @param {string} data.resetUrl - Password reset URL with token
 * @param {number} [data.expiresInMinutes] - Token expiration time in minutes
 * @returns {string} Complete HTML email
 */
export function passwordResetEmailHtml(data) {
  const {
    name,
    email,
    resetUrl,
    expiresInMinutes = 60
  } = data;

  const content = `
    <h2 style="margin: 0 0 20px 0; color: #111827; font-size: 20px; font-weight: 600;">
      Password Reset Request
    </h2>

    <p style="margin: 0 0 16px 0; color: #374151; font-size: 15px; line-height: 24px;">
      Hi ${name},
    </p>

    <p style="margin: 0 0 16px 0; color: #374151; font-size: 15px; line-height: 24px;">
      We received a request to reset the password for your Chartwarden account associated with <strong>${email}</strong>.
    </p>

    <p style="margin: 0 0 16px 0; color: #374151; font-size: 15px; line-height: 24px;">
      Click the button below to reset your password:
    </p>

    ${buttonComponent({ text: 'Reset Your Password', url: resetUrl })}

    ${alertComponent({
      message: `This link will expire in ${expiresInMinutes} minutes. If you did not request a password reset, please ignore this email or contact support if you have concerns.`,
      type: 'warning'
    })}

    <p style="margin: 20px 0 16px 0; color: #374151; font-size: 15px; line-height: 24px;">
      If the button above doesn't work, copy and paste the following URL into your browser:
    </p>

    <p style="margin: 0 0 20px 0; padding: 12px; background-color: #f3f4f6; border-radius: 4px; word-break: break-all;">
      <a href="${resetUrl}" style="color: #2563eb; text-decoration: none; font-size: 13px;">
        ${resetUrl}
      </a>
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

    <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 20px;">
      <strong>Security Tips:</strong>
    </p>
    <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #6b7280; font-size: 13px; line-height: 22px;">
      <li>Never share your password with anyone</li>
      <li>Use a strong, unique password</li>
      <li>Enable two-factor authentication if available</li>
    </ul>
  `;

  return baseTemplate({
    title: 'Reset Your Password',
    content
  });
}

/**
 * Generate password reset email plain text
 * @param {Object} data - Template data
 * @param {string} data.name - User's name
 * @param {string} data.email - User's email
 * @param {string} data.resetUrl - Password reset URL with token
 * @param {number} [data.expiresInMinutes] - Token expiration time in minutes
 * @returns {string} Plain text email
 */
export function passwordResetEmailText(data) {
  const {
    name,
    email,
    resetUrl,
    expiresInMinutes = 60
  } = data;

  return `
PASSWORD RESET REQUEST
======================

Hi ${name},

We received a request to reset the password for your Chartwarden account associated with ${email}.

Reset your password by visiting:
${resetUrl}

IMPORTANT: This link will expire in ${expiresInMinutes} minutes.

If you did not request a password reset, please ignore this email or contact support if you have concerns.

SECURITY TIPS:
- Never share your password with anyone
- Use a strong, unique password
- Enable two-factor authentication if available

---
This is an automated message from Chartwarden. Please do not reply to this email.
  `.trim();
}

export default { passwordResetEmailHtml, passwordResetEmailText };
