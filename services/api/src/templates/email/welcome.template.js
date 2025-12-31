/**
 * Welcome Email Template
 * Sent to new users after registration
 */

import { baseTemplate, buttonComponent, alertComponent } from './base.template.js';

/**
 * Generate welcome email HTML
 * @param {Object} data - Template data
 * @param {string} data.name - User's name
 * @param {string} data.email - User's email
 * @param {string} [data.loginUrl] - URL to login page
 * @param {string} [data.supportEmail] - Support email address
 * @returns {string} Complete HTML email
 */
export function welcomeEmailHtml(data) {
  const {
    name,
    email,
    loginUrl = process.env.APP_URL || 'http://localhost:3000',
    supportEmail = process.env.SUPPORT_EMAIL || 'support@chartwarden.com'
  } = data;

  const content = `
    <h2 style="margin: 0 0 20px 0; color: #111827; font-size: 20px; font-weight: 600;">
      Welcome to Chartwarden, ${name}!
    </h2>

    <p style="margin: 0 0 16px 0; color: #374151; font-size: 15px; line-height: 24px;">
      Your account has been successfully created. You can now access the Hospice EHR system to manage patient care documentation, certifications, and clinical workflows.
    </p>

    <p style="margin: 0 0 16px 0; color: #374151; font-size: 15px; line-height: 24px;">
      <strong>Your login email:</strong> ${email}
    </p>

    ${buttonComponent({ text: 'Sign In to Your Account', url: loginUrl })}

    <h3 style="margin: 30px 0 16px 0; color: #111827; font-size: 16px; font-weight: 600;">
      Getting Started
    </h3>

    <ul style="margin: 0 0 20px 0; padding-left: 20px; color: #374151; font-size: 15px; line-height: 28px;">
      <li>Complete your profile information</li>
      <li>Review assigned patients and care plans</li>
      <li>Familiarize yourself with the documentation workflows</li>
      <li>Check pending certification alerts and tasks</li>
    </ul>

    ${alertComponent({
      message: 'Please ensure you follow all HIPAA compliance guidelines when accessing patient information.',
      type: 'info'
    })}

    <p style="margin: 20px 0 0 0; color: #374151; font-size: 15px; line-height: 24px;">
      If you have any questions or need assistance, please contact our support team at
      <a href="mailto:${supportEmail}" style="color: #2563eb; text-decoration: none;">${supportEmail}</a>.
    </p>
  `;

  return baseTemplate({
    title: 'Welcome to Chartwarden',
    content
  });
}

/**
 * Generate welcome email plain text
 * @param {Object} data - Template data
 * @param {string} data.name - User's name
 * @param {string} data.email - User's email
 * @param {string} [data.loginUrl] - URL to login page
 * @param {string} [data.supportEmail] - Support email address
 * @returns {string} Plain text email
 */
export function welcomeEmailText(data) {
  const {
    name,
    email,
    loginUrl = process.env.APP_URL || 'http://localhost:3000',
    supportEmail = process.env.SUPPORT_EMAIL || 'support@chartwarden.com'
  } = data;

  return `
Welcome to Chartwarden, ${name}!

Your account has been successfully created. You can now access the Hospice EHR system to manage patient care documentation, certifications, and clinical workflows.

Your login email: ${email}

Sign in at: ${loginUrl}

GETTING STARTED
---------------
- Complete your profile information
- Review assigned patients and care plans
- Familiarize yourself with the documentation workflows
- Check pending certification alerts and tasks

IMPORTANT: Please ensure you follow all HIPAA compliance guidelines when accessing patient information.

If you have any questions or need assistance, please contact our support team at ${supportEmail}.

---
This is an automated message from Chartwarden. Please do not reply to this email.
  `.trim();
}

export default { welcomeEmailHtml, welcomeEmailText };
