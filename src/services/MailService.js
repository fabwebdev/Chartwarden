import nodemailer from 'nodemailer';
import mailConfig from '../config/mail.config.js';

import { logger } from '../utils/logger.js';
class MailService {
    constructor() {
        this.config = mailConfig;
        this.transporter = null;
        this.initializeTransporter();
    }
    
    /**
     * Initialize the mail transporter
     */
    initializeTransporter() {
        const defaultMailer = this.config.default;
        const mailerConfig = this.config.mailers[defaultMailer];
        
        if (!mailerConfig) {
            logger.warn(`Mailer configuration for ${defaultMailer} not found`)
            return;
        }
        
        switch (mailerConfig.transport) {
            case 'smtp':
                this.transporter = nodemailer.createTransport({
                    host: mailerConfig.host,
                    port: mailerConfig.port,
                    secure: mailerConfig.encryption === 'ssl',
                    auth: {
                        user: mailerConfig.username,
                        pass: mailerConfig.password
                    },
                    tls: {
                        rejectUnauthorized: false
                    }
                });
                break;

            case 'sendmail':
                this.transporter = nodemailer.createTransport({
                    sendmail: true,
                    newline: 'unix',
                    path: mailerConfig.path
                });
                break;

            case 'log':
                this.transporter = nodemailer.createTransport({
                    streamTransport: true,
                    buffer: true
                });
                break;
                
            case 'null':
            default:
                // No-op transporter
                this.transporter = {
                    sendMail: (options, callback) => {
                        logger.info('Email would be sent:', options)
                        callback(null, { messageId: 'mock-message-id' });
                    }
                };
                break;
        }
    }
    
    /**
     * Send an email
     * @param {Object} options - Email options
     * @returns {Promise} Promise that resolves when email is sent
     */
    async send(options) {
        if (!this.transporter) {
            throw new Error('Mail transporter not initialized');
        }
        
        // Merge with default from address
        const mailOptions = {
            from: options.from || `${this.config.from.name} <${this.config.from.address}>`,
            ...options
        };
        
        try {
            const info = await this.transporter.sendMail(mailOptions);
            logger.info('Email sent:', info.messageId)
            return info;
        } catch (error) {
            logger.error('Error sending email:', error)
            throw error;
        }
    }
    
    /**
     * Send a plain text email
     * @param {string} to - Recipient email address
     * @param {string} subject - Email subject
     * @param {string} text - Plain text content
     * @returns {Promise} Promise that resolves when email is sent
     */
    async sendText(to, subject, text) {
        return await this.send({
            to: to,
            subject: subject,
            text: text
        });
    }
    
    /**
     * Send an HTML email
     * @param {string} to - Recipient email address
     * @param {string} subject - Email subject
     * @param {string} html - HTML content
     * @returns {Promise} Promise that resolves when email is sent
     */
    async sendHtml(to, subject, html) {
        return await this.send({
            to: to,
            subject: subject,
            html: html
        });
    }
    
    /**
     * Verify the transporter configuration
     * @returns {Promise} Promise that resolves when transporter is verified
     */
    async verify() {
        if (!this.transporter) {
            throw new Error('Mail transporter not initialized');
        }
        
        try {
            await this.transporter.verify();
            logger.info('Mail transporter verified successfully')
            return true;
        } catch (error) {
            logger.error('Error verifying mail transporter:', error)
            return false;
        }
    }
}

export default new MailService();