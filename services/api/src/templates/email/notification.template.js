/**
 * General Notification Email Template
 * For system notifications, alerts, and general communications
 */

import { baseTemplate, buttonComponent, alertComponent } from './base.template.js';

/**
 * Generate notification email HTML
 * @param {Object} data - Template data
 * @param {string} data.title - Notification title
 * @param {string} data.message - Main notification message
 * @param {string} [data.recipientName] - Recipient's name
 * @param {string} [data.type] - Notification type: 'info', 'warning', 'error', 'success'
 * @param {Object} [data.action] - Optional action button
 * @param {string} [data.action.text] - Button text
 * @param {string} [data.action.url] - Button URL
 * @param {Array} [data.details] - Optional list of key-value details
 * @returns {string} Complete HTML email
 */
export function notificationEmailHtml(data) {
  const {
    title,
    message,
    recipientName,
    type = 'info',
    action,
    details = []
  } = data;

  const typeColors = {
    info: '#2563eb',
    warning: '#f59e0b',
    error: '#ef4444',
    success: '#22c55e'
  };

  const greeting = recipientName ? `<p style="margin: 0 0 16px 0; color: #374151; font-size: 15px; line-height: 24px;">Hi ${recipientName},</p>` : '';

  const detailsList = details.length > 0 ? `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 20px 0; width: 100%;">
      ${details.map(({ label, value }) => `
        <tr>
          <td style="padding: 8px 12px; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 13px; font-weight: 500; width: 40%;">
            ${label}
          </td>
          <td style="padding: 8px 12px; background-color: #ffffff; border-bottom: 1px solid #e5e7eb; color: #374151; font-size: 14px;">
            ${value}
          </td>
        </tr>
      `).join('')}
    </table>
  ` : '';

  const actionButton = action ? buttonComponent({ text: action.text, url: action.url, color: typeColors[type] }) : '';

  const content = `
    <h2 style="margin: 0 0 20px 0; color: #111827; font-size: 20px; font-weight: 600;">
      ${title}
    </h2>

    ${greeting}

    ${alertComponent({ message, type })}

    ${detailsList}

    ${actionButton}
  `;

  return baseTemplate({
    title,
    content,
    primaryColor: typeColors[type]
  });
}

/**
 * Generate notification email plain text
 * @param {Object} data - Template data
 * @param {string} data.title - Notification title
 * @param {string} data.message - Main notification message
 * @param {string} [data.recipientName] - Recipient's name
 * @param {Object} [data.action] - Optional action button
 * @param {string} [data.action.text] - Button text
 * @param {string} [data.action.url] - Button URL
 * @param {Array} [data.details] - Optional list of key-value details
 * @returns {string} Plain text email
 */
export function notificationEmailText(data) {
  const {
    title,
    message,
    recipientName,
    action,
    details = []
  } = data;

  const greeting = recipientName ? `Hi ${recipientName},\n\n` : '';

  const detailsList = details.length > 0
    ? '\n' + details.map(({ label, value }) => `${label}: ${value}`).join('\n') + '\n'
    : '';

  const actionLink = action ? `\n${action.text}: ${action.url}\n` : '';

  return `
${title.toUpperCase()}
${'='.repeat(title.length)}

${greeting}${message}
${detailsList}${actionLink}
---
This is an automated message from Chartwarden. Please do not reply to this email.
  `.trim();
}

/**
 * Generate certification alert email HTML
 * @param {Object} data - Template data
 * @param {string} data.alertType - Type: 'UPCOMING_CERT', 'OVERDUE_CERT', 'F2F_REQUIRED', 'F2F_OVERDUE'
 * @param {string} data.patientName - Patient's full name
 * @param {string} data.mrn - Medical record number
 * @param {string} data.certificationPeriod - Certification period
 * @param {string} data.dueDate - Due date
 * @param {string} [data.priority] - Priority: 'NORMAL', 'HIGH', 'CRITICAL'
 * @returns {string} Complete HTML email
 */
export function certificationAlertEmailHtml(data) {
  const {
    alertType,
    patientName,
    mrn,
    certificationPeriod,
    dueDate,
    priority = 'NORMAL'
  } = data;

  const alertMessages = {
    'UPCOMING_CERT': 'A certification is due soon and requires physician attestation.',
    'OVERDUE_CERT': 'URGENT: A certification is overdue and requires immediate attention.',
    'F2F_REQUIRED': 'A Face-to-Face encounter is required within 30 days before recertification.',
    'F2F_OVERDUE': 'URGENT: A Face-to-Face encounter is overdue. This is required for Medicare reimbursement.'
  };

  const alertTypes = {
    'UPCOMING_CERT': 'warning',
    'OVERDUE_CERT': 'error',
    'F2F_REQUIRED': 'warning',
    'F2F_OVERDUE': 'error'
  };

  const priorityLabels = {
    'NORMAL': 'Normal',
    'HIGH': 'High',
    'CRITICAL': 'Critical'
  };

  return notificationEmailHtml({
    title: `Certification Alert: ${alertType.replace(/_/g, ' ')}`,
    message: alertMessages[alertType] || 'A certification-related action is required.',
    type: alertTypes[alertType] || 'info',
    details: [
      { label: 'Patient', value: patientName },
      { label: 'MRN', value: mrn },
      { label: 'Certification Period', value: certificationPeriod },
      { label: 'Due Date', value: dueDate },
      { label: 'Priority', value: priorityLabels[priority] || priority }
    ],
    action: {
      text: 'View in Chartwarden',
      url: process.env.APP_URL || 'http://localhost:3000'
    }
  });
}

export default { notificationEmailHtml, notificationEmailText, certificationAlertEmailHtml };
