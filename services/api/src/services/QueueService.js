import queueConfig from '../config/queue.config.js';

import { logger } from '../utils/logger.js';
class QueueService {
    constructor() {
        this.connection = queueConfig.default;
        this.config = queueConfig.connections[this.connection];
        this.jobs = [];
        this.failedJobs = [];

        // Job registry to prevent code injection (replaces eval())
        this.registeredJobs = new Map();
    }

    /**
     * Register a job handler
     * @param {string} jobName - Unique job name
     * @param {Function} handler - Job handler function
     * @throws {Error} If job name already registered
     */
    registerJob(jobName, handler) {
        if (typeof jobName !== 'string' || jobName.trim() === '') {
            throw new Error('Job name must be a non-empty string');
        }

        if (typeof handler !== 'function') {
            throw new Error('Job handler must be a function');
        }

        if (this.registeredJobs.has(jobName)) {
            throw new Error(`Job "${jobName}" is already registered`);
        }

        this.registeredJobs.set(jobName, handler);
    }

    /**
     * Unregister a job handler
     * @param {string} jobName - Job name to unregister
     */
    unregisterJob(jobName) {
        this.registeredJobs.delete(jobName);
    }

    /**
     * Get all registered job names
     * @returns {string[]} Array of registered job names
     */
    getRegisteredJobNames() {
        return Array.from(this.registeredJobs.keys());
    }

    /**
     * Push a job onto the queue
     * @param {string} queue - The queue name
     * @param {string} jobName - The registered job name to execute
     * @param {Object} data - The job data
     * @returns {string} Job ID
     */
    async push(queue, jobName, data = {}) {
        // Validate job is registered
        if (typeof jobName !== 'string') {
            throw new Error('Job name must be a string (not a function). Use registerJob() first.');
        }

        if (!this.registeredJobs.has(jobName)) {
            throw new Error(`Job "${jobName}" is not registered. Available jobs: ${this.getRegisteredJobNames().join(', ')}`);
        }

        const jobId = this.generateJobId();

        const jobData = {
            id: jobId,
            queue: queue,
            jobName: jobName,  // Store job name instead of function code
            data: data,
            attempts: 0,
            createdAt: new Date()
        };

        // For sync driver, execute immediately
        if (this.connection === 'sync') {
            try {
                const handler = this.registeredJobs.get(jobName);
                await handler(data);
                return jobId;
            } catch (error) {
                this.handleFailedJob(jobData, error);
                throw error;
            }
        }

        // For other drivers, store the job
        this.jobs.push(jobData);
        return jobId;
    }

    /**
     * Process jobs in the queue
     */
    async process() {
        // For sync driver, there's nothing to process
        if (this.connection === 'sync') {
            return;
        }

        // Process jobs
        for (let i = 0; i < this.jobs.length; i++) {
            const jobData = this.jobs[i];

            try {
                // Get the registered job handler (NO EVAL - SECURE!)
                const handler = this.registeredJobs.get(jobData.jobName);

                if (!handler) {
                    throw new Error(`Job "${jobData.jobName}" is not registered`);
                }

                await handler(jobData.data);

                // Remove successful job
                this.jobs.splice(i, 1);
                i--;
            } catch (error) {
                this.handleFailedJob(jobData, error);

                // Remove failed job
                this.jobs.splice(i, 1);
                i--;
            }
        }
    }
    
    /**
     * Handle a failed job
     * @param {Object} jobData - The job data
     * @param {Error} error - The error that occurred
     */
    handleFailedJob(jobData, error) {
        const failedJob = {
            ...jobData,
            failedAt: new Date(),
            exception: error.message,
            trace: error.stack
        };
        
        this.failedJobs.push(failedJob);
        logger.error(`Job ${jobData.id} failed:`, error)
    }
    
    /**
     * Generate a unique job ID
     * @returns {string} Job ID
     */
    generateJobId() {
        return 'job_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * Get the number of pending jobs
     * @returns {number} Number of pending jobs
     */
    pending() {
        return this.jobs.length;
    }
    
    /**
     * Get the number of failed jobs
     * @returns {number} Number of failed jobs
     */
    failed() {
        return this.failedJobs.length;
    }
    
    /**
     * Get all jobs
     * @returns {Array} All jobs
     */
    getJobs() {
        return this.jobs;
    }
    
    /**
     * Get all failed jobs
     * @returns {Array} All failed jobs
     */
    getFailedJobs() {
        return this.failedJobs;
    }
}

export default new QueueService();