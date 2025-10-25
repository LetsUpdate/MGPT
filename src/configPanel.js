// Configuration Panel Module
const ConfigPanel = (() => {
  const usf = unsafeWindow;
  
  // Constants
  const KEY_COMBO_SHOW = 'Alt+Shift+C'; // Key combination to show/hide panel
  const STORAGE_KEY = 'gptConfig';
  const DEFAULT_CONFIG = {
    apiKey: '',
    model: 'o1-mini',
    xisConfigured: false
  };

  // State
  let isVisible = false;
  let config = { ...DEFAULT_CONFIG };
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
    panel.innerHTML = `
      <div class="gpt-config-header">
        <h3>GPT Configuration</h3>
        <button class="gpt-config-close">&times;</button>
      </div>
      <div class="gpt-config-content">
        <div class="gpt-config-field">
          <label for="apiKey">API Key:</label>
          <input type="password" id="apiKey" value="${config.apiKey}">
        </div>
        <div class="gpt-config-field">
          <label for="model">Model:</label>
          <select id="model">
            <option value="o1-mini" ${config.model === 'o1-mini' ? 'selected' : ''}>o1-mini (Gyors & Költséghatékony)</option>
            <option value="gpt-4o" ${config.model === 'gpt-4o' ? 'selected' : ''}>GPT-4o (Legfejlettebb)</option>
            <option value="gpt-5" ${config.model === 'gpt-5' ? 'selected' : ''}>GPT-5 (Haladó)</option>
          </select>
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

  // Load saved config
  const loadConfig = () => {
    return new Promise((resolve) => {
      try {
        const savedConfig = JSON.parse(GM_getValue(STORAGE_KEY));
        if (savedConfig) {
          config = { ...DEFAULT_CONFIG, ...savedConfig };
          // Ellenőrizzük, hogy a betöltött konfig érvényes-e
          config.isConfigured = isValidApiKey(config.apiKey);
          // Ha változott az isConfigured, mentsük el
          if (config.isConfigured !== savedConfig.isConfigured) {
            GM_setValue(STORAGE_KEY, JSON.stringify(config));
          }
        }

        resolve(config);
      } catch (e) {
        console.warn('Failed to load config:', e);
        config = { ...DEFAULT_CONFIG };
        config.isConfigured = false;
        resolve(config);
      }
    });
  };

  // Initialize the panel
  const init = async () => {
    await loadConfig();

    // Create stealth overlay and panel
    overlay = createStealthOverlay();
    panelElement = createPanel();
    appendToOverlay(panelElement);

    // Add event listeners
    document.addEventListener('keydown', handleKeyPress);
    panelElement.querySelector('.gpt-config-close').addEventListener('click', hide);
    panelElement.querySelector('.gpt-config-save').addEventListener('click', saveSettings);

    // Show panel on first launch if not configured
    if (!config.isConfigured) {
      show();
    }
  };

  // Event handler for key combinations
  const handleKeyPress = (event) => {
    // Shift + Control + H
    if (event.shiftKey && event.ctrlKey && event.key.toLowerCase() === 'h') {
      toggle();
      event.preventDefault(); // Megelőzzük az alapértelmezett böngésző előzmények megnyitását
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
  };

  // Hide panel
  const hide = () => {
    isVisible = false;
    panelElement.classList.remove('visible');
  };

  // Validate API key
  const isValidApiKey = (key) => {
    return key && key.trim().length >= 32; // Minimum hossz egy API kulcshoz
  };

  // Save settings
  const saveSettings = () => {
    const apiKey = panelElement.querySelector('#apiKey').value;
    const model = panelElement.querySelector('#model').value;

    // Csak akkor állítjuk be isConfigured-ot true-ra, ha valid API kulcs van
    const isConfigured = isValidApiKey(apiKey);

    const newConfig = {
      apiKey,
      model,
      isConfigured
    };

    if (!isConfigured) {
      alert('Kérlek adj meg egy érvényes API kulcsot!');
      return;
    }

    config = { ...config, ...newConfig };
    GM_setValue(STORAGE_KEY, JSON.stringify(config));
    hide();
  };

  // Get current config
  const getConfig = () => ({ ...config });

  // Public API
  return {
    init,
    show,
    hide,
    toggle,
    getConfig
  };
})();

// Make it available for CommonJS require
module.exports = ConfigPanel;
//where user can set API URL, model, it can be hidden or shown, at firts launch it is whon allwyays till the GPT settings arent set, but after it will be hidden allwyays unless I unhide it whith a key combination, I want A hide function unhide function, and save settings function, and the tothers