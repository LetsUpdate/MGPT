// Configuration storage and management system

const STORAGE_KEY = 'gptConfig';

// Default configuration
const DEFAULT_CONFIG = {
    apiKey: '',
    model: 'o1-mini',
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    temperature: 0.7,
    maxTokens: 2000,
    isConfigured: false
};

// Configuration change listeners
const configListeners = new Set();

// Current configuration
let currentConfig = { ...DEFAULT_CONFIG };

/**
 * Configuration store for managing GPT and application settings
 */
class ConfigStore {
    /**
     * Loads configuration from storage
     * @returns {Promise<Object>} The loaded configuration
     */
    async load() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const storedConfig = JSON.parse(stored);
                currentConfig = { ...DEFAULT_CONFIG, ...storedConfig };
            }
            return this.getConfig();
        } catch (error) {
            console.error('Failed to load configuration:', error);
            return this.getConfig();
        }
    }

    /**
     * Saves current configuration to storage
     */
    save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(currentConfig));
        } catch (error) {
            console.error('Failed to save configuration:', error);
        }
    }

    /**
     * Updates configuration with new values
     * @param {Object} newConfig - New configuration values to merge
     */
    update(newConfig) {
        currentConfig = {
            ...currentConfig,
            ...newConfig
        };
        
        // Update isConfigured based on API key presence
        currentConfig.isConfigured = Boolean(currentConfig.apiKey);
        
        this.save();
        this.notifyListeners();
    }

    /**
     * Gets current configuration
     * @returns {Object} Current configuration
     */
    getConfig() {
        return { ...currentConfig };
    }

    /**
     * Resets configuration to defaults
     */
    reset() {
        currentConfig = { ...DEFAULT_CONFIG };
        this.save();
        this.notifyListeners();
    }

    /**
     * Adds a configuration change listener
     * @param {Function} listener - Callback function for config changes
     */
    addListener(listener) {
        configListeners.add(listener);
    }

    /**
     * Removes a configuration change listener
     * @param {Function} listener - Listener to remove
     */
    removeListener(listener) {
        configListeners.delete(listener);
    }

    /**
     * Notifies all config change listeners
     * @private
     */
    notifyListeners() {
        const config = this.getConfig();
        configListeners.forEach(listener => {
            try {
                listener(config);
            } catch (error) {
                console.error('Error in config listener:', error);
            }
        });
    }
}

// Export singleton instance
const configStore = new ConfigStore();
module.exports = configStore;
