/**
 * Base Email Template
 * Provides consistent styling and layout for all email templates
 */

/**
 * Generate the base HTML wrapper for emails
 * @param {Object} options - Template options
 * @param {string} options.title - Email title for the header
 * @param {string} options.content - Main content HTML
 * @param {string} [options.footerText] - Optional footer text
 * @param {string} [options.primaryColor] - Primary brand color (default: #2563eb)
 * @returns {string} Complete HTML email
 */
export function baseTemplate({ title, content, footerText, primaryColor = '#2563eb' }) {
  const currentYear = new Date().getFullYear();
  const appName = process.env.APP_NAME || 'Chartwarden';
  const footer = footerText || `This is an automated message from ${appName}. Please do not reply to this email.`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>${title}</title>
  <style>
    /* Reset styles */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; }

    /* Remove spacing around the email design on iOS */
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; }

    /* Force Outlook.com to display emails full width */
    .ExternalClass { width: 100%; }
    .ExternalClass, .ExternalClass p, .ExternalClass span, .ExternalClass font, .ExternalClass td, .ExternalClass div { line-height: 100%; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; max-width: 600px;">
          <!-- Header -->
          <tr>
            <td style="background-color: ${primaryColor}; padding: 30px 40px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                ${appName}
              </h1>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="background-color: #ffffff; padding: 40px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px 40px; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 13px; line-height: 20px;">
                ${footer}
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                &copy; ${currentYear} ${appName}. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Generate a button component for emails
 * @param {Object} options - Button options
 * @param {string} options.text - Button text
 * @param {string} options.url - Button link URL
 * @param {string} [options.color] - Button background color
 * @returns {string} Button HTML
 */
export function buttonComponent({ text, url, color = '#2563eb' }) {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 30px 0;">
      <tr>
        <td style="background-color: ${color}; border-radius: 6px;">
          <a href="${url}" target="_blank" style="display: inline-block; padding: 14px 30px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
            ${text}
          </a>
        </td>
      </tr>
    </table>
  `.trim();
}

/**
 * Generate an alert/callout box
 * @param {Object} options - Alert options
 * @param {string} options.message - Alert message
 * @param {string} [options.type] - Alert type: 'info', 'warning', 'error', 'success'
 * @returns {string} Alert HTML
 */
export function alertComponent({ message, type = 'info' }) {
  const colors = {
    info: { bg: '#eff6ff', border: '#2563eb', text: '#1e40af' },
    warning: { bg: '#fffbeb', border: '#f59e0b', text: '#92400e' },
    error: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' },
    success: { bg: '#f0fdf4', border: '#22c55e', text: '#166534' }
  };

  const style = colors[type] || colors.info;

  return `
    <div style="background-color: ${style.bg}; border-left: 4px solid ${style.border}; padding: 16px 20px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; color: ${style.text}; font-size: 14px; line-height: 22px;">
        ${message}
      </p>
    </div>
  `.trim();
}

export default { baseTemplate, buttonComponent, alertComponent };
