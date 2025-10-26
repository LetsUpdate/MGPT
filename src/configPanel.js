// Configuration Panel Module
const configStore = require('./configStore');

const ConfigPanel = (() => {
  const usf = unsafeWindow;
  
  // Constants
  const KEY_COMBO_SHOW = 'Alt+Shift+C'; // Key combination to show/hide panel

  // State
  let isVisible = false;
  let panelElement = null;
  let overlay = null;

  // Create stealth overlay
  const createStealthOverlay = () => {
    const document = window.document;
    const neverEqualPlaceholder = Symbol('never equal');
    let shadowRootHost = neverEqualPlaceholder;
    let shadowRootNewHost = neverEqualPlaceholder;
    
    const apply = Reflect.apply;
    
    if (usf.Error.hasOwnProperty('stackTraceLimit')) {
      Reflect.defineProperty(usf.Error, 'stackTraceLimit', {
        value: undefined,
        writable: false,
        enumerable: false,
        configurable: false,
      });
    }

    const shadowGetHandler = {
      apply: (target, thisArg, argumentsList) =>
        apply(target, thisArg === shadowRootHost ? shadowRootNewHost : thisArg, argumentsList),
    };

    const original_attachShadow = usf.Element.prototype.attachShadow;
    const attachShadowProxy = new Proxy(original_attachShadow, shadowGetHandler);
    usf.Element.prototype.attachShadow = attachShadowProxy;

    const getShadowRootProxy = new Proxy(
      Object.getOwnPropertyDescriptor(usf.Element.prototype, 'shadowRoot').get,
      shadowGetHandler
    );
    Object.defineProperty(usf.Element.prototype, 'shadowRoot', {
      get: getShadowRootProxy,
    });

    const getHostHandler = {
      apply: function () {
        const result = apply(...arguments);
        return result === shadowRootNewHost ? shadowRootHost : result;
      },
    };
    const getHostProxy = new Proxy(
      Object.getOwnPropertyDescriptor(usf.ShadowRoot.prototype, 'host').get,
      getHostHandler
    );
    Object.defineProperty(usf.ShadowRoot.prototype, 'host', {
      get: getHostProxy,
    });

    const overlayDiv = document.createElement('div');
    overlayDiv.style.cssText = `
      position: fixed;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 2147483646;
      transform: translate3d(0, 0, 0);
      will-change: transform;
      backface-visibility: hidden;
    `;

    if (!document.body) {
      document.addEventListener('DOMContentLoaded', () => document.body.appendChild(overlayDiv));
    } else {
      document.body.appendChild(overlayDiv);
    }

    return overlayDiv;
  };

  // Create the panel element
  const createPanel = () => {
    const panel = document.createElement('div');
    panel.className = 'gpt-config-panel';
    const currentConfig = configStore.getConfig();
    
    panel.innerHTML = `
      <div class="gpt-config-header">
        <h3>GPT Configuration</h3>
        <button class="gpt-config-close">&times;</button>
      </div>
      <div class="gpt-config-content">
        <div class="gpt-config-field">
          <label for="apiKey">API Key:</label>
          <input type="password" id="apiKey" value="${currentConfig.apiKey}">
        </div>
        <div class="gpt-config-field">
          <label for="model">Model:</label>
          <select id="model">
            <option value="o1-mini" ${currentConfig.model === 'o1-mini' ? 'selected' : ''}>o1-mini (Gyors & Költséghatékony)</option>
            <option value="gpt-4o" ${currentConfig.model === 'gpt-4o' ? 'selected' : ''}>GPT-4o (Legfejlettebb)</option>
            <option value="gpt-5" ${currentConfig.model === 'gpt-5' ? 'selected' : ''}>GPT-5 (Haladó)</option>
          </select>
        </div>
        <div class="gpt-config-field">
          <label for="apiUrl">API URL:</label>
          <input type="text" id="apiUrl" value="${currentConfig.apiUrl}">
        </div>
        <button class="gpt-config-save">Save Settings</button>
      </div>
    `;

    // Add styles
    const styles = document.createElement('style');
    styles.textContent = `
      .gpt-config-panel {
        position: fixed;
        bottom: 20px;
        left: 20px;
        background: rgba(255, 255, 255, 0.95);
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        backdrop-filter: blur(5px);
        z-index: 2147483647;
        min-width: 300px;
        display: none;
        pointer-events: auto;
        transform: translate3d(0, 0, 0);
        will-change: transform;
        opacity: 0.98;
      }
      .gpt-config-panel.visible {
        display: block;
      }
      .gpt-config-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
      }
      .gpt-config-close {
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
      }
      .gpt-config-field {
        margin-bottom: 15px;
      }
      .gpt-config-field label {
        display: block;
        margin-bottom: 5px;
      }
      .gpt-config-field input,
      .gpt-config-field select {
        width: 100%;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
      }
      .gpt-config-save {
        width: 100%;
        padding: 10px;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
      .gpt-config-save:hover {
        background: #0056b3;
      }
    `;
    document.head.appendChild(styles);
    return panel;
  };

  // Position panel in overlay
  const appendToOverlay = (element) => {
    element.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      z-index: 1;
      transform: translate3d(0, 0, 0);
      will-change: transform;
      backface-visibility: hidden;
    `;

    overlay.appendChild(element);
  };

  // Initialize the panel
  const init =  () => {

    // Create stealth overlay and panel
    overlay = createStealthOverlay();
    panelElement = createPanel();
    appendToOverlay(panelElement);

    // Add event listeners
    document.addEventListener('keydown', handleKeyPress);
    panelElement.querySelector('.gpt-config-close').addEventListener('click', hide);
    panelElement.querySelector('.gpt-config-save').addEventListener('click', saveSettings);

    const currentConfig = configStore.getConfig();
    // Show panel on first launch if not configured
    if (!currentConfig.isConfigured) {
      show();
    }

    // Add config change listener
    configStore.addListener((newConfig) => {
      updatePanelValues(newConfig);
    });
  };

  // Event handler for key combinations
  const handleKeyPress = (event) => {
    // Shift + Control + H
    if (event.shiftKey && event.ctrlKey && event.key.toLowerCase() === 'h') {
      toggle();
      event.preventDefault(); // Prevent browser history from opening
      return;
    }
  };

  // Toggle panel visibility
  const toggle = () => {
    if (isVisible) {
      hide();
    } else {
      show();
    }
  };

  // Show panel
  const show = () => {
    isVisible = true;
    panelElement.classList.add('visible');
    updatePanelValues(configStore.getConfig());
  };

  // Hide panel
  const hide = () => {
    isVisible = false;
    panelElement.classList.remove('visible');
  };

  // Update panel values with current config
  const updatePanelValues = (config) => {
    if (!panelElement) return;
    
    const apiKeyInput = panelElement.querySelector('#apiKey');
    const modelSelect = panelElement.querySelector('#model');
    const apiUrlInput = panelElement.querySelector('#apiUrl');

    if (apiKeyInput) apiKeyInput.value = config.apiKey || '';
    if (modelSelect) modelSelect.value = config.model || 'o1-mini';
    if (apiUrlInput) apiUrlInput.value = config.apiUrl || '';
  };

  // Validate API key
  const isValidApiKey = (key) => {
    return key && key.trim().length >= 32; // Minimum length for API key
  };

  // Save settings
  const saveSettings = () => {
    const apiKey = panelElement.querySelector('#apiKey').value;
    const model = panelElement.querySelector('#model').value;
    const apiUrl = panelElement.querySelector('#apiUrl').value;

    // Only set isConfigured to true if API key is valid
    if (!isValidApiKey(apiKey)) {
      alert('Please enter a valid API key!');
      return;
    }

    const newConfig = {
      apiKey,
      model,
      apiUrl,
      isConfigured: true
    };

    configStore.update(newConfig);
    hide();
  };

  // Public API
  return {
    init,
    show,
    hide,
    toggle
  };
})();

// Make it available for CommonJS require
module.exports = ConfigPanel;
//where user can set API URL, model, it can be hidden or shown, at firts launch it is whon allwyays till the GPT settings arent set, but after it will be hidden allwyays unless I unhide it whith a key combination, I want A hide function unhide function, and save settings function, and the tothers