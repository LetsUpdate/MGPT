// Configuration Panel Module
const configStore = require('../configStore');
const fileUploadHelpers = require('../fileUploadHelpers');
const documentManager = require('../documentManager');
const { Logger } = require('../logger');

const ConfigPanel = (() => {
  const usf = unsafeWindow;
  
  // Constants
  const KEY_COMBO_SHOW = 'Ctrl+Shift+H'; // Key combination to show/hide panel (Cmd+Shift+H on Mac)

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
            <option value="o1-mini" ${currentConfig.model === 'o1-mini' ? 'selected' : ''}>o1-mini (Gyors gondolkodó)</option>
            <option value="o1" ${currentConfig.model === 'o1' ? 'selected' : ''}>o1 (Fejlett gondolkodó)</option>
            <option value="o3" ${currentConfig.model === 'o3' ? 'selected' : ''}>o3 (Legújabb gondolkodó)</option>
            <option value="gpt-4o" ${currentConfig.model === 'gpt-4o' ? 'selected' : ''}>GPT-4o (Legfejlettebb)</option>
            <option value="gpt-5" ${currentConfig.model === 'gpt-5' ? 'selected' : ''}>GPT-5 (Haladó)</option>
          </select>
          <small>Gondolkodó modellek (o1, o3) lassabbak, de pontosabbak.</small>
        </div>
        <div class="gpt-config-field">
          <label for="apiUrl">API URL:</label>
          <input type="text" id="apiUrl" value="${currentConfig.apiUrl}">
          <small>Csak az API kulcs kell az OpenAI-hoz, semmi más beállítás!</small>
        </div>
        
        <hr style="margin: 8px 0; border: none; border-top: 1px solid rgba(0,0,0,0.1);">
        
        <div class="gpt-config-field">
          <label>📁 Fájl Feltöltés (Responses API):</label>
          <input type="file" id="fileUpload" accept=".pdf,.txt,.doc,.docx" style="font-size: 10px; margin: 4px 0;">
          <button class="gpt-config-upload-file" style="width: 100%; padding: 4px; margin-top: 4px; font-size: 10px;">Feltöltés</button>
          <small>PDF, TXT fájlok feltöltése a pontosabb válaszokhoz.</small>
          <div id="uploadedFilesList" style="margin-top: 4px; font-size: 9px; max-height: 60px; overflow-y: auto;"></div>
        </div>
        
        <div class="gpt-config-field">
          <label for="useResponsesAPI">✨ Használd a Responses API-t:</label>
          <input type="checkbox" id="useResponsesAPI" ${currentConfig.useResponsesAPI ? 'checked' : ''}>
          <small><strong>Bekapcsolva:</strong> A feltöltött fájlokat használja válaszadáshoz. <strong>Először hozz létre asszisztenst!</strong></small>
        </div>
        
        <div class="gpt-config-field" style="background: rgba(0,100,255,0.05); padding: 6px; border-radius: 3px; margin-top: 4px;">
          <div style="font-size: 9px; font-weight: bold; margin-bottom: 3px;">📊 Asszisztens Státusz:</div>
          <div id="assistantStatus" style="font-size: 9px;"></div>
          <button class="gpt-config-create-assistant" style="width: 100%; padding: 4px; margin-top: 4px; font-size: 9px; background: #28a745;">Asszisztens Létrehozása</button>
        </div>
        
        <div class="gpt-config-field">
          <label for="debugLogging">🐛 Debug Naplózás:</label>
          <input type="checkbox" id="debugLogging" ${currentConfig.debugLogging !== false ? 'checked' : ''}>
          <small>Részletes naplók megjelenítése a konzolban és a napló nézetben.</small>
        </div>
        
        <div class="gpt-config-field" style="background: rgba(100,100,100,0.05); padding: 6px; border-radius: 3px;">
          <button class="gpt-config-show-logs" style="width: 100%; padding: 4px; font-size: 9px; background: #6c757d; color: white;">📜 Naplók Megtekintése</button>
        </div>
        
        <hr style="margin: 8px 0; border: none; border-top: 1px solid rgba(0,0,0,0.1);">
        
        <div class="gpt-config-field">
          <label for="copyResoults">Másolat vágólapra (copyResoults):</label>
          <input type="checkbox" id="copyResoults" ${currentConfig.copyResoults ? 'checked' : ''}>
          <small>Amint a GPT válaszol, a válasz(ok) automatikusan a vágólapra kerülnek.</small>
        </div>
        <div class="gpt-config-field">
          <label for="shortAnswerMode">Rövid válaszok (TEXT/MULTIPLE_TEXT):</label>
          <input type="checkbox" id="shortAnswerMode" ${currentConfig.shortAnswerMode ? 'checked' : ''}>
          <small>GPT nagyon rövid, tömör válaszokat ad szöveges kérdésekre. Shortcut: <strong>Cmd/Ctrl+Shift+S</strong></small>
        </div>
        <div class="gpt-config-field">
          <label for="autoMode">Automatikus mód:</label>
          <input type="checkbox" id="autoMode" ${currentConfig.autoMode ? 'checked' : ''}>
          <small>Automatikusan megoldja a kérdéseket és rákattint a Next gombra.</small>
        </div>
        <div class="gpt-config-field">
          <label for="maxParallelQuestions">Max párhuzamos kérdések:</label>
          <input type="number" id="maxParallelQuestions" value="${currentConfig.maxParallelQuestions || 10}" min="1" max="50" step="1">
          <small>Maximális párhuzamosan megoldható kérdések száma (alapértelmezett: 10).</small>
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
        padding: 10px;
        border-radius: 6px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12);
        backdrop-filter: blur(5px);
        z-index: 2147483647;
        min-width: 180px;
        max-width: 280px;
        max-height: 85vh;
        overflow-y: auto;
        display: none;
        pointer-events: auto;
        transform: translate3d(0, 0, 0) scale(0.55);
        transform-origin: bottom left;
        will-change: transform;
        opacity: 0.98;
        font-size: 11px;
      }
      .gpt-config-panel.visible {
        display: block;
      }
      .gpt-config-panel::-webkit-scrollbar {
        width: 6px;
      }
      .gpt-config-panel::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.05);
        border-radius: 3px;
      }
      .gpt-config-panel::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.2);
        border-radius: 3px;
      }
      .gpt-config-panel::-webkit-scrollbar-thumb:hover {
        background: rgba(0, 0, 0, 0.3);
      }
      .gpt-config-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
        position: sticky;
        top: 0;
        background: rgba(255, 255, 255, 0.95);
        padding-bottom: 5px;
        z-index: 1;
      }
      .gpt-config-header h3 {
        font-size: 14px;
        margin: 0;
      }
      .gpt-config-close {
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        line-height: 1;
      }
      .gpt-config-field {
        margin-bottom: 8px;
      }
      .gpt-config-field label {
        display: block;
        margin-bottom: 3px;
        font-size: 11px;
      }
      .gpt-config-field small {
        font-size: 9px;
        display: block;
        margin-top: 2px;
        opacity: 0.8;
      }
      .gpt-config-field input,
      .gpt-config-field select {
        width: 100%;
        padding: 5px;
        border: 1px solid #ddd;
        border-radius: 3px;
        font-size: 11px;
      }
      .gpt-config-field input[type="checkbox"] {
        width: auto;
      }
      .gpt-config-save,
      .gpt-config-test,
      .gpt-config-test-text,
      .gpt-config-upload-file {
        width: 100%;
        padding: 6px;
        background: #007bff;
        color: white;
        border: none;
        border-radius: 3px;
        cursor: pointer;
        font-size: 11px;
        margin-top: 4px;
      }
      .gpt-config-upload-file {
        background: #28a745;
      }
      .gpt-config-save:hover,
      .gpt-config-test:hover,
      .gpt-config-test-text:hover {
        background: #0056b3;
      }
      .gpt-config-upload-file:hover {
        background: #218838;
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
    
    // Create short answer mode indicator
    createShortAnswerIndicator();

    // Add event listeners
    document.addEventListener('keydown', handleKeyPress);
    panelElement.querySelector('.gpt-config-close').addEventListener('click', hide);
    panelElement.querySelector('.gpt-config-save').addEventListener('click', saveSettings);
    panelElement.querySelector('.gpt-config-test').addEventListener('click', testSettings);
    panelElement.querySelector('.gpt-config-test-text').addEventListener('click', testTextQuestion);
    panelElement.querySelector('.gpt-config-upload-file').addEventListener('click', handleFileUpload);
    panelElement.querySelector('.gpt-config-create-assistant').addEventListener('click', handleCreateAssistant);
    panelElement.querySelector('.gpt-config-show-logs').addEventListener('click', showLogViewer);

    const currentConfig = configStore.getConfig();
    // Show panel on first launch if not configured
    if (!currentConfig.isConfigured) {
      show();
    }

    // Update assistant status display
    updateAssistantStatus();
    
    // Update uploaded files list
    updateFilesList();

    // Add config change listener
    configStore.addListener((newConfig) => {
      updatePanelValues(newConfig);
      updateShortAnswerIndicator(newConfig.shortAnswerMode);
    });
    
    // Update indicator initially
    updateShortAnswerIndicator(currentConfig.shortAnswerMode);
  };

  // Event handler for key combinations
  const handleKeyPress = (event) => {
    // Platform-aware modifier key (Cmd on Mac, Ctrl on Windows/Linux)
    const modKey = event.metaKey || event.ctrlKey;
    
    // Cmd/Ctrl + Shift + H - Toggle config panel
    if (modKey && event.shiftKey && event.key.toLowerCase() === 'h') {
      toggle();
      event.preventDefault();
      return;
    }
    
    // Cmd/Ctrl + Shift + S - Toggle short answer mode
    if (modKey && event.shiftKey && event.key.toLowerCase() === 's') {
      configStore.toggleShortAnswerMode();
      // showShortAnswerToast(newState); // Disabled - less intrusive
      event.preventDefault();
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
    const shortAnswerInput = panelElement.querySelector('#shortAnswerMode');
    const autoModeInput = panelElement.querySelector('#autoMode');
    const maxParallelQuestionsInput = panelElement.querySelector('#maxParallelQuestions');
    const useResponsesAPIInput = panelElement.querySelector('#useResponsesAPI');
    const debugLoggingInput = panelElement.querySelector('#debugLogging');

    if (apiKeyInput) apiKeyInput.value = config.apiKey || '';
    if (modelSelect) modelSelect.value = config.model || 'o1-mini';
    if (apiUrlInput) apiUrlInput.value = config.apiUrl || '';
    if (copyResultsInput) copyResultsInput.checked = Boolean(config.copyResoults);
    if (shortAnswerInput) shortAnswerInput.checked = Boolean(config.shortAnswerMode);
    if (autoModeInput) autoModeInput.checked = Boolean(config.autoMode);
    if (maxParallelQuestionsInput) maxParallelQuestionsInput.value = Number(config.maxParallelQuestions || 10);
    if (useResponsesAPIInput) useResponsesAPIInput.checked = Boolean(config.useResponsesAPI);
    if (debugLoggingInput) debugLoggingInput.checked = config.debugLogging !== false;
    
    // Update status displays
    updateAssistantStatus();
    updateFilesList();
  };

  // Validate API key
  const isValidApiKey = (key) => {
    // OpenAI keys start with 'sk-' and are typically 51+ characters
    // Allow shorter keys for custom/self-hosted endpoints
    return key && key.trim().length >= 20;
  };

  // Save settings
  const saveSettings = () => {
    const apiKey = panelElement.querySelector('#apiKey').value;
    const model = panelElement.querySelector('#model').value;
    const apiUrl = panelElement.querySelector('#apiUrl').value;
    const copyResoults = panelElement.querySelector('#copyResoults').checked;
    const shortAnswerMode = panelElement.querySelector('#shortAnswerMode').checked;
    const autoMode = panelElement.querySelector('#autoMode').checked;
    const maxParallelQuestions = Number(panelElement.querySelector('#maxParallelQuestions').value || 10);
    const useResponsesAPI = panelElement.querySelector('#useResponsesAPI').checked;
    const debugLogging = panelElement.querySelector('#debugLogging').checked;

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
      shortAnswerMode,
      autoMode,
      maxParallelQuestions,
      useResponsesAPI,
      debugLogging,
      isConfigured: true
    };

    configStore.update(newConfig);
    Logger.info('CONFIG', 'Settings saved', newConfig);
    hide();
  };

  // Handle file upload
  const handleFileUpload = async () => {
    const fileInput = panelElement.querySelector('#fileUpload');
    const uploadBtn = panelElement.querySelector('.gpt-config-upload-file');
    
    if (!fileInput.files || fileInput.files.length === 0) {
      alert('Kérlek válassz egy fájlt!');
      return;
    }
    
    const file = fileInput.files[0];
    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Feltöltés...';
    
    try {
      // Read file as base64
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const content = e.target.result;
          
          Logger.info('UI', 'Starting file upload', { filename: file.name, size: file.size });
          
          // Upload the file using document manager
          const result = await documentManager.uploadFile({
            filename: file.name,
            content: content
          });
          
          // Update UI
          updateFilesList();
          updateAssistantStatus();
          
          // Clear input
          fileInput.value = '';
          
          alert(`Fájl sikeresen feltöltve!\n\nFájl: ${file.name}\nID: ${result.id}\n\nMost hozz létre egy asszisztenst a "Asszisztens Létrehozása" gombbal, hogy használni tudd a fájlt.`);
          
        } catch (error) {
          Logger.error('UI', 'File upload failed', error);
          alert('Hiba a fájl feltöltése során: ' + error.message);
        } finally {
          uploadBtn.disabled = false;
          uploadBtn.textContent = 'Feltöltés';
        }
      };
      
      reader.onerror = () => {
        alert('Hiba a fájl olvasása során');
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Feltöltés';
      };
      
      // Read as data URL (includes base64)
      reader.readAsDataURL(file);
      
    } catch (error) {
      Logger.error('UI', 'File upload error', error);
      alert('Hiba: ' + error.message);
      uploadBtn.disabled = false;
      uploadBtn.textContent = 'Feltöltés';
    }
  };

  // Update uploaded files list display
  const updateFilesList = () => {
    const fileListDiv = panelElement?.querySelector('#uploadedFilesList');
    if (!fileListDiv) return;

    const files = documentManager.listFiles();
    
    if (files.length === 0) {
      fileListDiv.innerHTML = '<div style="color: #888;">Nincs feltöltött fájl</div>';
      return;
    }

    fileListDiv.innerHTML = files.map(file => `
      <div style="padding: 2px; background: rgba(46, 204, 113, 0.1); margin: 2px 0; border-radius: 2px; display: flex; justify-content: space-between; align-items: center;">
        <span>✓ ${file.filename}</span>
        <button onclick="window.deleteFile('${file.id}')" style="background: #dc3545; color: white; border: none; padding: 1px 4px; border-radius: 2px; cursor: pointer; font-size: 8px;">X</button>
      </div>
    `).join('');
  };

  // Global delete file function
  window.deleteFile = async (fileId) => {
    if (!confirm('Biztosan törölni szeretnéd ezt a fájlt?')) return;
    
    try {
      await documentManager.deleteFile(fileId);
      updateFilesList();
      updateAssistantStatus();
      Logger.info('UI', 'File deleted', { fileId });
    } catch (error) {
      Logger.error('UI', 'File deletion failed', error);
      alert('Hiba a fájl törlésekor: ' + error.message);
    }
  };

  // Update assistant status display
  const updateAssistantStatus = () => {
    const statusDiv = panelElement?.querySelector('#assistantStatus');
    if (!statusDiv) return;

    const status = documentManager.getAssistantStatus();
    const config = configStore.getConfig();

    statusDiv.innerHTML = `
      <div style="margin-bottom: 2px;">
        <strong>Asszisztens:</strong> ${status.hasAssistant ? '✅ Aktív' : '❌ Nincs'}
      </div>
      ${status.hasAssistant ? `<div style="margin-bottom: 2px;"><strong>ID:</strong> ${status.assistantId.substring(0, 20)}...</div>` : ''}
      <div style="margin-bottom: 2px;">
        <strong>Fájlok:</strong> ${status.fileCount} db
      </div>
      <div style="margin-bottom: 2px;">
        <strong>Responses API:</strong> ${config.useResponsesAPI ? '✅ Bekapcsolva' : '❌ Kikapcsolva'}
      </div>
      ${config.useResponsesAPI && !status.hasAssistant ? '<div style="color: #dc3545; font-weight: bold;">⚠️ Hozz létre asszisztenst!</div>' : ''}
    `;
  };

  // Handle assistant creation
  const handleCreateAssistant = async () => {
    const createBtn = panelElement.querySelector('.gpt-config-create-assistant');
    const files = documentManager.listFiles();
    
    if (files.length === 0) {
      alert('Először tölts fel fájlokat!');
      return;
    }

    createBtn.disabled = true;
    createBtn.textContent = 'Létrehozás...';
    
    try {
      const fileIds = files.map(f => f.id);
      
      await documentManager.createAssistantWithFiles({
        name: 'MGPT Tanulási Asszisztens',
        instructions: 'Te egy hasznos tanulási asszisztens vagy. Használd a feltöltött tananyagokat, hogy pontos válaszokat adj az akadémiai kérdésekre. Mindig a feltöltött dokumentumok alapján válaszolj.',
        fileIds
      });
      
      updateAssistantStatus();
      
      alert(`Asszisztens sikeresen létrehozva ${fileIds.length} fájllal!\n\nMost már bekapcsolhatod a "Használd a Responses API-t" opciót, és a kvíz kérdések automatikusan a feltöltött fájlok kontextusával lesznek megválaszolva.`);
      
    } catch (error) {
      Logger.error('UI', 'Assistant creation failed', error);
      alert('Hiba az asszisztens létrehozásakor: ' + error.message);
    } finally {
      createBtn.disabled = false;
      createBtn.textContent = 'Asszisztens Létrehozása';
    }
  };

  // Show log viewer
  const showLogViewer = () => {
    const logs = Logger.getLogs();
    
    // Create log viewer window
    const logWindow = document.createElement('div');
    logWindow.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 80%;
      max-width: 800px;
      height: 80%;
      background: white;
      border: 2px solid #333;
      border-radius: 8px;
      z-index: 2147483648;
      display: flex;
      flex-direction: column;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;
    
    logWindow.innerHTML = `
      <div style="padding: 10px; background: #333; color: white; display: flex; justify-content: space-between; align-items: center; border-radius: 6px 6px 0 0;">
        <h3 style="margin: 0; font-size: 16px;">📜 MGPT Naplók (${logs.length})</h3>
        <div>
          <button id="clearLogs" style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; margin-right: 5px;">Törlés</button>
          <button id="exportLogs" style="background: #28a745; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; margin-right: 5px;">Exportálás</button>
          <button id="closeLogs" style="background: #6c757d; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">Bezárás</button>
        </div>
      </div>
      <div style="padding: 10px; background: #f8f9fa; border-bottom: 1px solid #dee2e6;">
        <label style="margin-right: 10px;">
          <input type="checkbox" id="filterDebug" checked> DEBUG
        </label>
        <label style="margin-right: 10px;">
          <input type="checkbox" id="filterInfo" checked> INFO
        </label>
        <label style="margin-right: 10px;">
          <input type="checkbox" id="filterWarn" checked> WARN
        </label>
        <label style="margin-right: 10px;">
          <input type="checkbox" id="filterError" checked> ERROR
        </label>
      </div>
      <div id="logContent" style="flex: 1; overflow-y: auto; padding: 10px; background: #f8f9fa; font-family: monospace; font-size: 11px;"></div>
    `;
    
    document.body.appendChild(logWindow);
    
    // Render logs
    const renderLogs = () => {
      const debugFilter = logWindow.querySelector('#filterDebug').checked;
      const infoFilter = logWindow.querySelector('#filterInfo').checked;
      const warnFilter = logWindow.querySelector('#filterWarn').checked;
      const errorFilter = logWindow.querySelector('#filterError').checked;
      
      const filteredLogs = Logger.getLogs().filter(log => {
        if (log.level === 'DEBUG' && !debugFilter) return false;
        if (log.level === 'INFO' && !infoFilter) return false;
        if (log.level === 'WARN' && !warnFilter) return false;
        if (log.level === 'ERROR' && !errorFilter) return false;
        return true;
      });
      
      const logContent = logWindow.querySelector('#logContent');
      logContent.innerHTML = filteredLogs.map(log => {
        const color = {
          'DEBUG': '#888',
          'INFO': '#0066cc',
          'WARN': '#ff9800',
          'ERROR': '#dc3545'
        }[log.level] || '#000';
        
        return `
          <div style="margin-bottom: 8px; padding: 6px; background: white; border-left: 3px solid ${color}; border-radius: 3px;">
            <div style="font-weight: bold; color: ${color};">
              [${log.timestamp}] [${log.level}] [${log.category}]
            </div>
            <div style="margin-top: 2px;">${log.message}</div>
            ${log.data ? `<pre style="margin: 4px 0 0 0; padding: 4px; background: #f0f0f0; border-radius: 2px; font-size: 10px; overflow-x: auto;">${JSON.stringify(log.data, null, 2)}</pre>` : ''}
          </div>
        `;
      }).join('');
      
      // Auto-scroll to bottom
      logContent.scrollTop = logContent.scrollHeight;
    };
    
    renderLogs();
    
    // Event listeners
    logWindow.querySelector('#closeLogs').addEventListener('click', () => {
      document.body.removeChild(logWindow);
    });
    
    logWindow.querySelector('#clearLogs').addEventListener('click', () => {
      if (confirm('Biztosan törölni szeretnéd az összes naplót?')) {
        Logger.clearLogs();
        renderLogs();
      }
    });
    
    logWindow.querySelector('#exportLogs').addEventListener('click', () => {
      const logsJson = Logger.exportLogs();
      const blob = new Blob([logsJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mgpt-logs-${new Date().toISOString()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
    
    logWindow.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', renderLogs);
    });
    
    // Add real-time log updates
    const logListener = () => renderLogs();
    Logger.addListener(logListener);
    
    // Clean up listener when window closes
    const originalClose = logWindow.querySelector('#closeLogs').onclick;
    logWindow.querySelector('#closeLogs').onclick = () => {
      Logger.removeListener(logListener);
      originalClose();
    };
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
    const { gptManager, AnswerType } = require('../gptManager');

    try {
      const testBtn = panelElement.querySelector('.gpt-config-test');
      if (testBtn) { testBtn.disabled = true; testBtn.textContent = 'Testing…'; }
      // Minimal quick test: simple text prompt
      const resp = await gptManager.askGPT(
        'This is a connectivity test. Reply with {"type":"text","answer":"OK"}.',
        [],
        AnswerType.TEXT,
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

    const { gptManager, AnswerType } = require('../gptManager');

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

  // Create short answer mode indicator
  const createShortAnswerIndicator = () => {
    const indicator = document.createElement('div');
    indicator.id = 'short-answer-indicator';
    indicator.innerHTML = '📝';
    indicator.title = 'Rövid válasz mód (Cmd/Ctrl+Shift+S)';
    
    const styles = document.createElement('style');
    styles.textContent = `
      #short-answer-indicator {
        position: fixed;
        top: 10px;
        right: 10px;
        width: 18px;
        height: 18px;
        background: rgba(100, 100, 100, 0.3);
        border: 1px solid rgba(80, 80, 80, 0.2);
        border-radius: 3px;
        display: none;
        align-items: center;
        justify-content: center;
        font-size: 9px;
        z-index: 2147483646;
        box-shadow: none;
        cursor: pointer;
        transition: all 0.2s ease;
        user-select: none;
        opacity: 0.5;
      }
      #short-answer-indicator.active {
        display: flex;
      }
      #short-answer-indicator:hover {
        transform: scale(1.2);
        opacity: 1;
        background: rgba(46, 204, 113, 0.7);
        border-color: rgba(46, 204, 113, 0.5);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }
      .short-answer-toast {
        position: fixed;
        top: 50px;
        right: 10px;
        background: rgba(0, 0, 0, 0.75);
        color: white;
        padding: 8px 16px;
        border-radius: 6px;
        z-index: 2147483647;
        font-size: 13px;
        font-weight: 500;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        animation: slideInRight 0.3s ease-out;
        pointer-events: none;
      }
      .short-answer-toast.success {
        background: rgba(46, 204, 113, 0.85);
      }
      .short-answer-toast.info {
        background: rgba(52, 152, 219, 0.85);
      }
      @keyframes slideInRight {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOutRight {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(400px);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(styles);
    
    // Add click handler to toggle
    indicator.addEventListener('click', () => {
      configStore.toggleShortAnswerMode();
      // showShortAnswerToast(newState); // Disabled - less intrusive
    });
    
    document.body.appendChild(indicator);
  };

  // Update short answer indicator visibility
  const updateShortAnswerIndicator = (isActive) => {
    const indicator = document.getElementById('short-answer-indicator');
    if (indicator) {
      if (isActive) {
        indicator.classList.add('active');
      } else {
        indicator.classList.remove('active');
      }
    }
  };

  // Show toast notification for short answer mode toggle
  const showShortAnswerToast = (isActive) => {
    const toast = document.createElement('div');
    toast.className = 'short-answer-toast ' + (isActive ? 'success' : 'info');
    toast.textContent = isActive 
      ? '✓ Rövid válasz mód BEKAPCSOLVA' 
      : '✗ Rövid válasz mód KIKAPCSOLVA';
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.3s ease-out';
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 2000);
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