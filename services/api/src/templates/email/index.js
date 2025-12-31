/**
 * Email Templates Index
 * Central export for all email templates
 */

// Named exports for direct imports
export { baseTemplate, buttonComponent, alertComponent } from './base.template.js';
export { welcomeEmailHtml, welcomeEmailText } from './welcome.template.js';
export { passwordResetEmailHtml, passwordResetEmailText } from './password-reset.template.js';
export {
  notificationEmailHtml,
  notificationEmailText,
  certificationAlertEmailHtml
} from './notification.template.js';

// Import all templates for default export
import { baseTemplate, buttonComponent, alertComponent } from './base.template.js';
import { welcomeEmailHtml, welcomeEmailText } from './welcome.template.js';
import { passwordResetEmailHtml, passwordResetEmailText } from './password-reset.template.js';
import {
  notificationEmailHtml,
  notificationEmailText,
  certificationAlertEmailHtml
} from './notification.template.js';

// Default export with all templates organized by type
const emailTemplates = {
  // Base components
  base: {
    baseTemplate,
    buttonComponent,
    alertComponent
  },

  // Welcome email
  welcome: {
    html: welcomeEmailHtml,
    text: welcomeEmailText
  },

  // Password reset email
  passwordReset: {
    html: passwordResetEmailHtml,
    text: passwordResetEmailText
  },

  // Notification emails
  notification: {
    html: notificationEmailHtml,
    text: notificationEmailText,
    certificationAlert: certificationAlertEmailHtml
  }
};

export default emailTemplates;
