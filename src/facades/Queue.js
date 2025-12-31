import QueueService from '../services/QueueService.js';

class Queue {
    /**
     * Register a job handler
     * @param {string} jobName - Unique job name
     * @param {Function} handler - Job handler function
     */
    static registerJob(jobName, handler) {
        return QueueService.registerJob(jobName, handler);
    }

    /**
     * Unregister a job handler
     * @param {string} jobName - Job name to unregister
     */
    static unregisterJob(jobName) {
        return QueueService.unregisterJob(jobName);
    }

    /**
     * Get all registered job names
     * @returns {string[]} Array of registered job names
     */
    static getRegisteredJobNames() {
        return QueueService.getRegisteredJobNames();
    }

    /**
     * Push a job onto the queue
     * @param {string} queue - The queue name
     * @param {string} jobName - The registered job name to execute
     * @param {Object} data - The job data
     * @returns {string} Job ID
     */
    static async push(queue, jobName, data = {}) {
        return await QueueService.push(queue, jobName, data);
    }

    /**
     * Process jobs in the queue
     */
    static async process() {
        return await QueueService.process();
    }

    /**
     * Get the number of pending jobs
     * @returns {number} Number of pending jobs
     */
    static pending() {
        return QueueService.pending();
    }

    /**
     * Get the number of failed jobs
     * @returns {number} Number of failed jobs
     */
    static failed() {
        return QueueService.failed();
    }

    /**
     * Get all jobs
     * @returns {Array} All jobs
     */
    static getJobs() {
        return QueueService.getJobs();
    }

    /**
     * Get all failed jobs
     * @returns {Array} All failed jobs
     */
    static getFailedJobs() {
        return QueueService.getFailedJobs();
    }
}

export default Queue;