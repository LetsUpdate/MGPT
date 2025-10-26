/* const utils = require("./utils");
const { LookForCaptcha } = require('./captchaSolver');
const {PlaceLogo} = require('./UImodul');
 */
const configPanel = require("./configPanel");
const configStore = require("./configStore");
const questionSolver = require("./questionSolver");



(function () {
    'use strict';

    // Initialize the application
    const init = async () => {
        try {
            // First load the configuration
            await configStore.load();
            
            // Then initialize the config panel
            configPanel.init();

            // Initialize the solver panel
            questionSolver.init();

            console.log('MoodleGPT initialized successfully');
        } catch (error) {
            console.error('Failed to initialize MoodleGPT:', error);
        }
    };

    // Run initialization when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }


})();