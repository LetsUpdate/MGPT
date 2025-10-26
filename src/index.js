/* const utils = require("./utils");
const { LookForCaptcha } = require('./captchaSolver');
const {PlaceLogo} = require('./UImodul');
 */
const configPanel = require("./configPanel");
const configStore = require("./configStore");


(function () {
    'use strict';

/*     if (utils.isNeptunPage() && utils.isLoginPage()) {
        // Set up a Mutation Observer to watch for changes in the DOM

        //Prevent npu to press login after the user too
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                const $abortLoginLink = $('#abortLogin > a');
                if ($abortLoginLink.length) {
                    $abortLoginLink[0].click();
                }
            }
        });
        console.log("LookForCaptcha");
        PlaceLogo();
        LookForCaptcha();
    } */

    // Initialize the application
    const init = async () => {
        try {
            // First load the configuration
            await configStore.load();
            
            // Then initialize the config panel
            configPanel.init();

            // Additional initialization can be added here
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