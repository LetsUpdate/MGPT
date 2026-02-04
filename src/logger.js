/**
 * Comprehensive logging system for debugging MGPT
 * Provides detailed logs for Responses API, file operations, and quiz solving
 */

const configStore = require('./configStore');

// Log levels
const LogLevel = {
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR'
};

// Log storage (in memory)
let logEntries = [];
const MAX_LOGS = 500; // Keep last 500 log entries

// Log listeners for real-time updates
const logListeners = new Set();

/**
 * Logger class
 */
class Logger {
    /**
     * Add a log entry
     * @param {string} level - Log level
     * @param {string} category - Log category (e.g., 'RESPONSES_API', 'FILE_UPLOAD', 'QUIZ')
     * @param {string} message - Log message
     * @param {Object} data - Additional data
     */
    static log(level, category, message, data = null) {
        const config = configStore.getConfig();
        
        // Skip debug logs if debug logging is disabled
        if (level === LogLevel.DEBUG && !config.debugLogging) {
            return;
        }

        const entry = {
            timestamp: new Date().toISOString(),
            level,
            category,
            message,
            data
        };

        // Add to log entries
        logEntries.push(entry);

        // Keep only last MAX_LOGS entries
        if (logEntries.length > MAX_LOGS) {
            logEntries = logEntries.slice(-MAX_LOGS);
        }

        // Console output with color coding (only if hideConsoleLogs is false)
        if (!config.hideConsoleLogs) {
            const prefix = `[${entry.timestamp}] [${level}] [${category}]`;
            const fullMessage = `${prefix} ${message}`;
            
            switch (level) {
                case LogLevel.DEBUG:
                    console.log(`%c${fullMessage}`, 'color: #888', data || '');
                    break;
                case LogLevel.INFO:
                    console.log(`%c${fullMessage}`, 'color: #0066cc', data || '');
                    break;
                case LogLevel.WARN:
                    console.warn(fullMessage, data || '');
                    break;
                case LogLevel.ERROR:
                    console.error(fullMessage, data || '');
                    break;
            }
        }

        // Notify listeners
        logListeners.forEach(listener => {
            try {
                listener(entry);
            } catch (e) {
                console.error('Error in log listener:', e);
            }
        });
    }

    static debug(category, message, data) {
        this.log(LogLevel.DEBUG, category, message, data);
    }

    static info(category, message, data) {
        this.log(LogLevel.INFO, category, message, data);
    }

    static warn(category, message, data) {
        this.log(LogLevel.WARN, category, message, data);
    }

    static error(category, message, data) {
        this.log(LogLevel.ERROR, category, message, data);
    }

    /**
     * Get all log entries
     * @param {Object} filter - Filter options
     * @returns {Array} Filtered log entries
     */
    static getLogs(filter = {}) {
        let filtered = [...logEntries];

        if (filter.level) {
            filtered = filtered.filter(e => e.level === filter.level);
        }

        if (filter.category) {
            filtered = filtered.filter(e => e.category === filter.category);
        }

        if (filter.since) {
            filtered = filtered.filter(e => new Date(e.timestamp) >= new Date(filter.since));
        }

        return filtered;
    }

    /**
     * Clear all logs
     */
    static clearLogs() {
        logEntries = [];
        this.info('SYSTEM', 'Logs cleared');
    }

    /**
     * Export logs as JSON
     * @returns {string} JSON string of logs
     */
    static exportLogs() {
        return JSON.stringify(logEntries, null, 2);
    }

    /**
     * Add a log listener
     * @param {Function} listener - Callback function
     */
    static addListener(listener) {
        logListeners.add(listener);
    }

    /**
     * Remove a log listener
     * @param {Function} listener - Callback function
     */
    static removeListener(listener) {
        logListeners.delete(listener);
    }

    /**
     * Log API request
     */
    static logAPIRequest(category, endpoint, method, data = null) {
        this.debug(category, `API Request: ${method} ${endpoint}`, data);
    }

    /**
     * Log API response
     */
    static logAPIResponse(category, endpoint, status, data = null) {
        if (status >= 200 && status < 300) {
            this.debug(category, `API Response: ${endpoint} - Status ${status}`, data);
        } else {
            this.error(category, `API Error: ${endpoint} - Status ${status}`, data);
        }
    }

    /**
     * Log file operation
     */
    static logFileOperation(operation, filename, result = null) {
        this.info('FILE_MGMT', `${operation}: ${filename}`, result);
    }

    /**
     * Log assistant operation
     */
    static logAssistantOperation(operation, assistantId, details = null) {
        this.info('ASSISTANT', `${operation}: ${assistantId}`, details);
    }

    /**
     * Log quiz question processing
     */
    static logQuizQuestion(question, answerType, useResponsesAPI) {
        const method = useResponsesAPI ? 'Responses API (Assistant)' : 'Standard API';
        this.info('QUIZ', `Processing question using ${method}`, {
            questionPreview: question.substring(0, 100) + '...',
            answerType
        });
    }

    /**
     * Log context verification
     */
    static logContextVerification(hasContext, fileCount, assistantId) {
        this.info('CONTEXT', 'Context verification', {
            hasContext,
            fileCount,
            assistantId,
            status: hasContext ? 'Using file context' : 'No file context'
        });
    }
}

module.exports = {
    Logger,
    LogLevel
};
