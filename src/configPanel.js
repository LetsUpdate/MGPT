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
        <div class="gpt-config-field">
          <label for="copyResoults">Másolat vágólapra (copyResoults):</label>
          <input type="checkbox" id="copyResoults" ${currentConfig.copyResoults ? 'checked' : ''}>
          <small>Amint a GPT válaszol, a válasz(ok) automatikusan a vágólapra kerülnek.</small>
        </div>
        <div class="gpt-config-field">
          <label for="ragEnabled">RAG szerver engedélyezése:</label>
          <input type="checkbox" id="ragEnabled" ${currentConfig.ragEnabled ? 'checked' : ''}>
          <small>Ki/bekapcsolja a RAG szervert a válaszok javításához.</small>
        </div>
        <div class="gpt-config-field">
          <label for="ragServerUrl">RAG szerver URL:</label>
          <input type="text" id="ragServerUrl" value="${currentConfig.ragServerUrl || 'http://localhost:7860'}">
          <small>A RAG szerver címe (alapértelmezett: http://localhost:7860).</small>
        </div>
        <div class="gpt-config-field">
          <label for="ragTopK">RAG Top-K eredmények:</label>
          <input type="number" id="ragTopK" min="1" max="20" step="1" value="${currentConfig.ragTopK || 5}">
          <small>Hány releváns dokumentumrészletet kérjen le (alapértelmezett: 5).</small>
        </div>
        <div class="gpt-config-field">
          <label for="ragQueryOptimizeEnabled">RAG lekérdezés optimalizálás:</label>
          <input type="checkbox" id="ragQueryOptimizeEnabled" ${currentConfig.ragQueryOptimizeEnabled ? 'checked' : ''}>
          <small>Gyors GPT-vel rövidíti/tömöríti a kérdést a RAG számára.</small>
        </div>
        <div class="gpt-config-field">
          <label for="ragQueryMaxChars">RAG max karakterszám (tömörített):</label>
          <input type="number" id="ragQueryMaxChars" min="40" max="500" step="10" value="${currentConfig.ragQueryMaxChars || 160}">
        </div>
        <button class="gpt-config-save">Save Settings</button>
        <button class="gpt-config-test">Test Settings</button>
        <button class="gpt-config-test-text">Quick Text Test</button>
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
    panelElement.querySelector('.gpt-config-test').addEventListener('click', testSettings);
    panelElement.querySelector('.gpt-config-test-text').addEventListener('click', testTextQuestion);

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
    const copyResultsInput = panelElement.querySelector('#copyResoults');
    const ragEnabledInput = panelElement.querySelector('#ragEnabled');
    const ragServerUrlInput = panelElement.querySelector('#ragServerUrl');
    const ragTopKInput = panelElement.querySelector('#ragTopK');
    const ragOptInput = panelElement.querySelector('#ragQueryOptimizeEnabled');
    const ragMaxCharsInput = panelElement.querySelector('#ragQueryMaxChars');

    if (apiKeyInput) apiKeyInput.value = config.apiKey || '';
    if (modelSelect) modelSelect.value = config.model || 'o1-mini';
    if (apiUrlInput) apiUrlInput.value = config.apiUrl || '';
    if (copyResultsInput) copyResultsInput.checked = Boolean(config.copyResoults);
    if (ragEnabledInput) ragEnabledInput.checked = Boolean(config.ragEnabled);
    if (ragServerUrlInput) ragServerUrlInput.value = config.ragServerUrl || 'http://localhost:7860';
    if (ragTopKInput) ragTopKInput.value = Number(config.ragTopK || 5);
    if (ragOptInput) ragOptInput.checked = Boolean(config.ragQueryOptimizeEnabled);
    if (ragMaxCharsInput) ragMaxCharsInput.value = Number(config.ragQueryMaxChars || 160);
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
    const copyResoults = panelElement.querySelector('#copyResoults').checked;
    const ragEnabled = panelElement.querySelector('#ragEnabled').checked;
    const ragServerUrl = panelElement.querySelector('#ragServerUrl').value;
    const ragTopK = Number(panelElement.querySelector('#ragTopK').value || 5);
    const ragQueryOptimizeEnabled = panelElement.querySelector('#ragQueryOptimizeEnabled').checked;
    const ragQueryMaxChars = Number(panelElement.querySelector('#ragQueryMaxChars').value || 160);

    // Only set isConfigured to true if API key is valid
    if (!isValidApiKey(apiKey)) {
      alert('Please enter a valid API key!');
      return;
    }

    const newConfig = {
      apiKey,
      model,
      apiUrl,
      copyResoults,
      ragEnabled,
      ragServerUrl,
      ragTopK,
      ragQueryOptimizeEnabled,
      ragQueryMaxChars,
      isConfigured: true
    };

    configStore.update(newConfig);
    hide();
  };

  // Perform a test GPT request with the currently entered values (without requiring save)
  const testSettings = async () => {
    const apiKey = panelElement.querySelector('#apiKey').value;
    const model = panelElement.querySelector('#model').value;
    const apiUrl = panelElement.querySelector('#apiUrl').value;

    // Allow testing with shorter keys when using custom/self-hosted endpoints
    const isOpenAI = /api\.openai\.com/.test(apiUrl);
    if (isOpenAI && !isValidApiKey(apiKey)) {
      alert('Please enter a valid API key first.');
      return;
    }

    // Lazy require to avoid circular deps on module load
    const { gptManager, AnswerType } = require('./gptManager');

    try {
      const testBtn = panelElement.querySelector('.gpt-config-test');
      if (testBtn) { testBtn.disabled = true; testBtn.textContent = 'Testing…'; }
      // Minimal quick test: simple text prompt
      const resp = await gptManager.askGPT(
        'This is a connectivity test. Reply with {"type":"text","answer":"OK"}.',
        [],
        AnswerType.TEXT,
        { apiKey, apiUrl, model, max_tokens: 20, temperature: 0 }
      );

      // Accept either strict OK or any non-empty answer as success
      const got = (typeof resp?.answer === 'string' ? resp.answer : (Array.isArray(resp?.correctAnswers) ? resp.correctAnswers.join(',') : ''));
      if (String(got || '').length > 0) {
        alert('GPT test succeeded. Response: ' + got.substring(0, 200));
      } else {
        alert('GPT test completed but response was empty. Please verify your settings.');
      }
    } catch (e) {
      console.error('Test request failed:', e);
      alert('GPT test failed: ' + (e?.message || e));
    } finally {
      const testBtn = panelElement.querySelector('.gpt-config-test');
      if (testBtn) { testBtn.disabled = false; testBtn.textContent = 'Test Settings'; }
    }
  };

  function formatAnswersValuesOnly(questionData, gptResponse) {
    // Prefer response-declared type; default to 'text' for Quick Text Test
    const rawType = (gptResponse && gptResponse.type) || (questionData && questionData.data && questionData.data.type) || 'text';
    const type = String(rawType).toLowerCase();

    // For Quick Text Test there is no questionData; handle TEXT robustly
    if (type === 'text') {
      const txt = (typeof gptResponse?.correctAnswers === 'string')
        ? gptResponse.correctAnswers
        : (Array.isArray(gptResponse?.correctAnswers) ? gptResponse.correctAnswers[0] : (gptResponse?.answer || ''));
      return String(txt || '').trim();
    }

    // Multiple-choice formatting (kept for completeness when used elsewhere)
    const answersMeta = (questionData && questionData.data && Array.isArray(questionData.data.answers)) ? questionData.data.answers : [];
    const provided = Array.isArray(gptResponse?.correctAnswers)
      ? gptResponse.correctAnswers
      : (gptResponse?.correctAnswers != null ? [gptResponse.correctAnswers] : []);

    const toIndex = (ans) => {
      if (ans == null) return -1;
      if (!isNaN(ans)) {
        const idx = parseInt(ans, 10);
        return (idx >= 0 && idx < answersMeta.length) ? idx : -1;
      }
      const lower = String(ans).trim().toLowerCase();
      return answersMeta.findIndex(a => String(a.text || '').trim().toLowerCase() === lower);
    };

    const indices = provided.map(toIndex).filter(i => i >= 0 && i < answersMeta.length);
    if (indices.length > 0) {
      const values = indices.map(i => String(answersMeta[i]?.text || '').trim()).filter(Boolean);
      const multi = (type === 'checkbox' || type === 'select');
      return values.join(multi ? '\n' : ', ');
    }

    // Fallback to provided as strings if we cannot map
    const str = provided.map(a => String(a)).filter(Boolean).join('\n');
    return str || '';
  }

  // Ask user for a TEXT question, run it, and show the result in an alert
  const testTextQuestion = async () => {
    const apiKey = panelElement.querySelector('#apiKey').value;
    const model = panelElement.querySelector('#model').value;
    const apiUrl = panelElement.querySelector('#apiUrl').value;

    const isOpenAI = /api\.openai\.com/.test(apiUrl);
    if (isOpenAI && !isValidApiKey(apiKey)) {
      alert('Please enter a valid API key first.');
      return;
    }

    const q = prompt('Add meg a kérdést (TEXT típus):');
    if (!q || !q.trim()) return;

    const { gptManager, AnswerType } = require('./gptManager');

    const btn = panelElement.querySelector('.gpt-config-test-text');
    try {
      if (btn) { btn.disabled = true; btn.textContent = 'Running…'; }
      const resp = await gptManager.askGPT(
        q.trim(),
        [],
        AnswerType.TEXT,

      );

      const formatted = formatAnswersValuesOnly(null, resp);
      alert('Válasz: ' + String(formatted || '').trim());
    } catch (e) {
      console.error('Quick Text Test failed:', e);
      alert('Hiba történt: ' + (e?.message || e));
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Quick Text Test'; }
    }
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