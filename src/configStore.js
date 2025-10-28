// Configuration storage and management system

const STORAGE_KEY = 'gptConfig';

// Default configuration
const DEFAULT_CONFIG = {
    apiKey: '',
    model: 'o1-mini',
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    temperature: 0.7,
    maxTokens: 2000,
    // Clipboard behavior
    copyResoults: false,
    // RAG settings
    ragServerUrl: 'http://localhost:7860',
    ragTopK: 5,
    ragEnabled: true,
    isConfigured: false
};

// Configuration change listeners
const configListeners = new Set();

// Current configuration
let currentConfig = { ...DEFAULT_CONFIG };

// Helper: detect userscript storage functions
const hasGM = (typeof GM_getValue === 'function' && typeof GM_setValue === 'function');

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
            let stored = null;
            if (hasGM) {
                try {
                    stored = GM_getValue(STORAGE_KEY, null);
                } catch (e) {
                    // GM_getValue may throw in some environments; fall back
                    stored = null;
                }
            } else if (typeof localStorage !== 'undefined') {
                stored = localStorage.getItem(STORAGE_KEY);
            }

            if (stored) {
                let storedConfig = stored;
                // GM storage may already return an object, or a JSON string
                if (typeof stored === 'string') {
                    try { storedConfig = JSON.parse(stored); } catch(e) { /* keep string */ }
                }
                if (typeof storedConfig === 'object') {
                    currentConfig = { ...DEFAULT_CONFIG, ...storedConfig };
                }
            }

            // Notify listeners of loaded config
            this.notifyListeners();
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
            if (hasGM) {
                try {
                    // GM_setValue can store objects in many runtimes, but stringify for safety
                    GM_setValue(STORAGE_KEY, JSON.stringify(currentConfig));
                } catch (e) {
                    // fallback: try to set directly
                    try { GM_setValue(STORAGE_KEY, currentConfig); } catch (e2) { /* ignore */ }
                }
            } else if (typeof localStorage !== 'undefined') {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(currentConfig));
            }
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
// Attempt to load saved configuration immediately so other pages/scripts can read it
configStore.load().then(cfg => {
    try {
        // Lightweight debug log to help verify cross-page loading (can be removed later)
        if (typeof console !== 'undefined') console.debug('ConfigStore loaded config:', cfg);
    } catch (e) {}
}).catch(()=>{});

module.exports = configStore;
