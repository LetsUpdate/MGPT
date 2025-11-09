/**
 * FryLabs Client Module
 * 
 * Ez a modul felelős a FryLabs API-val való kommunikációért.
 * Képes kérdéseket lekérdezni több FryLabs szerverről,
 * automatikus failover-rel és retry mechanizmussal.
 * 
 * @module frylabsClient
 */

const config = require('./config');

/**
 * FryLabs kliens osztály
 * Kezeli a FryLabs API kommunikációt, hibaellenőrzést és újrapróbálkozást
 */
class FryLabsClient {
    constructor(options = {}) {
        this.apiKey = options.apiKey || config.FRYLABS_KEY || '';
        this.urls = options.urls || config.FRYLABS_URLS || [];
        this.timeout = options.timeout || config.FRYLABS_TIMEOUT || 15000;
        this.retryCount = options.retryCount || config.FRYLABS_RETRY_COUNT || 2;
        
        // Cache a válaszoknak (opcionális)
        this.cache = new Map();
        this.cacheEnabled = options.cacheEnabled !== false;
        this.cacheTTL = options.cacheTTL || 3600000; // 1 óra alapértelmezetten
        
        // Statisztikák
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            cacheHits: 0,
            serverErrors: new Map(),
        };
        
        // Validálás
        this._validateConfig();
    }

    /**
     * Konfiguráció validálása
     * @private
     */
    _validateConfig() {
        if (!this.apiKey) {
            console.warn('[FryLabs] API kulcs nincs beállítva. A kérések sikertelenek lehetnek.');
        }
        
        if (!this.urls || this.urls.length === 0) {
            console.warn('[FryLabs] Nincsenek FryLabs URL-ek konfigurálva. Nem lesz elérhető a szolgáltatás.');
        }
        
        // URL-ek validálása
        this.urls = this.urls.filter(url => {
            try {
                new URL(url);
                return true;
            } catch (e) {
                console.error(`[FryLabs] Érvénytelen URL: ${url}`, e);
                return false;
            }
        });
    }

    /**
     * Cache kulcs generálása kérdésből
     * @private
     * @param {string} question - A kérdés szövege
     * @returns {string} Hash kulcs
     */
    _getCacheKey(question) {
        // Egyszerű hash függvény
        let hash = 0;
        const str = question.trim().toLowerCase();
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return `frylabs_${hash}`;
    }

    /**
     * Cache-ből való lekérdezés
     * @private
     * @param {string} key - Cache kulcs
     * @returns {Object|null} Cached válasz vagy null
     */
    _getFromCache(key) {
        if (!this.cacheEnabled) return null;
        
        const cached = this.cache.get(key);
        if (!cached) return null;
        
        const now = Date.now();
        if (now - cached.timestamp > this.cacheTTL) {
            this.cache.delete(key);
            return null;
        }
        
        this.stats.cacheHits++;
        return cached.data;
    }

    /**
     * Cache-be mentés
     * @private
     * @param {string} key - Cache kulcs
     * @param {Object} data - Mentendő adat
     */
    _saveToCache(key, data) {
        if (!this.cacheEnabled) return;
        
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
        
        // Cache méret limitálása (max 1000 elem)
        if (this.cache.size > 1000) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
    }

    /**
     * HTTP GET kérés FryLabs API-hoz
     * @private
     * @param {string} url - Teljes URL
     * @returns {Promise<Object>} API válasz
     */
    _makeRequest(url) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            
            const timeoutId = setTimeout(() => {
                xhr.abort();
                reject(new Error(`Request timeout after ${this.timeout}ms`));
            }, this.timeout);

            xhr.onload = () => {
                clearTimeout(timeoutId);
                
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve(response);
                    } catch (e) {
                        reject(new Error(`Invalid JSON response: ${e.message}`));
                    }
                } else {
                    reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
                }
            };

            xhr.onerror = () => {
                clearTimeout(timeoutId);
                reject(new Error('Network error'));
            };

            xhr.ontimeout = () => {
                clearTimeout(timeoutId);
                reject(new Error('Request timeout'));
            };

            xhr.open('GET', url, true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            
            if (this.apiKey) {
                xhr.setRequestHeader('Authorization', `Bearer ${this.apiKey}`);
                xhr.setRequestHeader('X-API-Key', this.apiKey);
            }
            
            try {
                xhr.send();
            } catch (e) {
                clearTimeout(timeoutId);
                reject(e);
            }
        });
    }

    /**
     * HTTP POST kérés FryLabs API-hoz
     * @private
     * @param {string} url - Teljes URL
     * @param {Object} data - Küldendő adat
     * @returns {Promise<Object>} API válasz
     */
    _makePostRequest(url, data) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            
            const timeoutId = setTimeout(() => {
                xhr.abort();
                reject(new Error(`Request timeout after ${this.timeout}ms`));
            }, this.timeout);

            xhr.onload = () => {
                clearTimeout(timeoutId);
                
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve(response);
                    } catch (e) {
                        reject(new Error(`Invalid JSON response: ${e.message}`));
                    }
                } else {
                    reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
                }
            };

            xhr.onerror = () => {
                clearTimeout(timeoutId);
                reject(new Error('Network error'));
            };

            xhr.ontimeout = () => {
                clearTimeout(timeoutId);
                reject(new Error('Request timeout'));
            };

            xhr.open('POST', url, true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            
            if (this.apiKey) {
                xhr.setRequestHeader('Authorization', `Bearer ${this.apiKey}`);
                xhr.setRequestHeader('X-API-Key', this.apiKey);
            }
            
            try {
                xhr.send(JSON.stringify(data));
            } catch (e) {
                clearTimeout(timeoutId);
                reject(e);
            }
        });
    }

    /**
     * Kérés küldése egy adott szerverhez újrapróbálkozással
     * @private
     * @param {string} serverUrl - Szerver URL
     * @param {Object} queryData - Query adat
     * @returns {Promise<Object>} Válasz vagy null
     */
    async _queryServerWithRetry(serverUrl, queryData) {
        let lastError = null;
        
        for (let attempt = 0; attempt <= this.retryCount; attempt++) {
            try {
                if (attempt > 0) {
                    console.log(`[FryLabs] Újrapróbálkozás ${attempt}/${this.retryCount}: ${serverUrl}`);
                    // Exponenciális backoff
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                }
                
                const response = await this._makePostRequest(serverUrl, queryData);
                
                // Sikeres válasz
                return response;
                
            } catch (error) {
                lastError = error;
                console.warn(`[FryLabs] Kérés sikertelen (kísérlet ${attempt + 1}/${this.retryCount + 1}):`, error.message);
                
                // Statisztika frissítése
                const errorCount = this.stats.serverErrors.get(serverUrl) || 0;
                this.stats.serverErrors.set(serverUrl, errorCount + 1);
            }
        }
        
        // Ha minden kísérlet sikertelen
        throw lastError;
    }

    /**
     * Kérdés lekérdezése a FryLabs adatbázisból
     * Automatikusan próbálkozik több szerverrel, ha az első nem elérhető
     * 
     * @param {string} question - A kérdés szövege
     * @param {Object} options - Opcionális paraméterek
     * @param {string} options.subject - Tantárgy neve
     * @param {string} options.testUrl - Teszt URL
     * @param {Array<string>} options.possibleAnswers - Lehetséges válaszok
     * @returns {Promise<Object|null>} Válasz objektum vagy null, ha nincs találat
     */
    async queryQuestion(question, options = {}) {
        this.stats.totalRequests++;
        
        // Validálás
        if (!question || typeof question !== 'string' || question.trim().length === 0) {
            console.error('[FryLabs] Érvénytelen kérdés paraméter');
            this.stats.failedRequests++;
            return null;
        }

        if (this.urls.length === 0) {
            console.warn('[FryLabs] Nincsenek elérhető szerverek konfigurálva');
            this.stats.failedRequests++;
            return null;
        }

        // Cache ellenőrzés
        const cacheKey = this._getCacheKey(question);
        const cachedResult = this._getFromCache(cacheKey);
        if (cachedResult) {
            console.log('[FryLabs] Cache találat a kérdésre');
            this.stats.successfulRequests++;
            return cachedResult;
        }

        // Query adat előkészítése
        const queryData = {
            question: question.trim(),
            subject: options.subject || '',
            testUrl: options.testUrl || '',
            possibleAnswers: options.possibleAnswers || [],
            timestamp: Date.now(),
        };

        // Próbálkozás az összes szerverrel
        for (let i = 0; i < this.urls.length; i++) {
            const serverUrl = this.urls[i];
            
            try {
                console.log(`[FryLabs] Kérdés küldése: ${serverUrl} (${i + 1}/${this.urls.length})`);
                
                const response = await this._queryServerWithRetry(serverUrl, queryData);
                
                // Válasz validálása
                if (this._isValidResponse(response)) {
                    console.log('[FryLabs] Sikeres válasz kapva:', response);
                    
                    // Cache-be mentés
                    this._saveToCache(cacheKey, response);
                    
                    this.stats.successfulRequests++;
                    return response;
                }
                
                console.warn('[FryLabs] Érvénytelen válasz formátum a szervertől');
                
            } catch (error) {
                console.error(`[FryLabs] Hiba a szerver ${serverUrl} lekérdezésekor:`, error);
                
                // Ha van még szerver, folytatjuk a következővel
                if (i < this.urls.length - 1) {
                    console.log('[FryLabs] Próbálkozás a következő szerverrel...');
                    continue;
                }
            }
        }

        // Ha minden szerver sikertelen volt
        console.warn('[FryLabs] Minden szerver sikertelen volt, nincs válasz');
        this.stats.failedRequests++;
        return null;
    }

    /**
     * Válasz validálása
     * @private
     * @param {Object} response - Szerver válasz
     * @returns {boolean} Érvényes-e a válasz
     */
    _isValidResponse(response) {
        if (!response || typeof response !== 'object') {
            return false;
        }

        // Ha nincs válasz (404)
        if (response.found === false || response.answer === null) {
            return false;
        }

        // Ha van válasz
        if (response.found === true && response.answer) {
            return true;
        }

        // Ha van answers tömb (régi formátum)
        if (Array.isArray(response.answers) && response.answers.length > 0) {
            return true;
        }

        return false;
    }

    /**
     * Több kérdés lekérdezése egyszerre (batch)
     * @param {Array<Object>} questions - Kérdések tömbje
     * @returns {Promise<Array<Object>>} Válaszok tömbje
     */
    async queryQuestions(questions) {
        if (!Array.isArray(questions) || questions.length === 0) {
            console.error('[FryLabs] Érvénytelen kérdések paraméter');
            return [];
        }

        console.log(`[FryLabs] Batch lekérdezés ${questions.length} kérdésre`);

        // Párhuzamos lekérdezés minden kérdésre
        const promises = questions.map(q => {
            const questionText = typeof q === 'string' ? q : q.question;
            const options = typeof q === 'object' ? q : {};
            return this.queryQuestion(questionText, options);
        });

        try {
            const results = await Promise.all(promises);
            console.log(`[FryLabs] Batch lekérdezés kész: ${results.filter(r => r !== null).length}/${questions.length} találat`);
            return results;
        } catch (error) {
            console.error('[FryLabs] Hiba a batch lekérdezés során:', error);
            return questions.map(() => null);
        }
    }

    /**
     * Szerver health check
     * @param {string} serverUrl - Szerver URL
     * @returns {Promise<boolean>} Elérhető-e a szerver
     */
    async checkServerHealth(serverUrl) {
        try {
            const healthUrl = `${serverUrl}/health`;
            const response = await this._makeRequest(healthUrl);
            return response.status === 'ok' || response.healthy === true;
        } catch (error) {
            console.warn(`[FryLabs] Health check sikertelen: ${serverUrl}`, error);
            return false;
        }
    }

    /**
     * Összes szerver health check-je
     * @returns {Promise<Array<Object>>} Szerverek állapota
     */
    async checkAllServers() {
        console.log('[FryLabs] Összes szerver ellenőrzése...');
        
        const checks = this.urls.map(async url => {
            const isHealthy = await this.checkServerHealth(url);
            return { url, isHealthy };
        });

        const results = await Promise.all(checks);
        
        results.forEach(r => {
            console.log(`[FryLabs] ${r.url}: ${r.isHealthy ? '✓ OK' : '✗ HIBA'}`);
        });

        return results;
    }

    /**
     * Cache törlése
     */
    clearCache() {
        this.cache.clear();
        console.log('[FryLabs] Cache törölve');
    }

    /**
     * Statisztikák lekérdezése
     * @returns {Object} Statisztikai adatok
     */
    getStats() {
        const serverErrorsObj = {};
        this.stats.serverErrors.forEach((count, url) => {
            serverErrorsObj[url] = count;
        });

        return {
            ...this.stats,
            serverErrors: serverErrorsObj,
            cacheSize: this.cache.size,
            successRate: this.stats.totalRequests > 0 
                ? ((this.stats.successfulRequests / this.stats.totalRequests) * 100).toFixed(2) + '%'
                : 'N/A'
        };
    }

    /**
     * Konfiguráció frissítése futás közben
     * @param {Object} newConfig - Új konfiguráció
     */
    updateConfig(newConfig) {
        if (newConfig.apiKey !== undefined) {
            this.apiKey = newConfig.apiKey;
        }
        if (newConfig.urls !== undefined) {
            this.urls = newConfig.urls;
            this._validateConfig();
        }
        if (newConfig.timeout !== undefined) {
            this.timeout = newConfig.timeout;
        }
        if (newConfig.retryCount !== undefined) {
            this.retryCount = newConfig.retryCount;
        }
        
        console.log('[FryLabs] Konfiguráció frissítve');
    }

    /**
     * Debug információk
     */
    debug() {
        console.log('[FryLabs] Debug információk:');
        console.log('  API Key:', this.apiKey ? `${this.apiKey.substring(0, 10)}...` : 'Nincs beállítva');
        console.log('  URLs:', this.urls);
        console.log('  Timeout:', this.timeout, 'ms');
        console.log('  Retry Count:', this.retryCount);
        console.log('  Cache enabled:', this.cacheEnabled);
        console.log('  Cache size:', this.cache.size);
        console.log('  Stats:', this.getStats());
    }
}

// Singleton instance export
let clientInstance = null;

/**
 * FryLabs kliens instance lekérése (singleton pattern)
 * @param {Object} options - Opcionális konfiguráció
 * @returns {FryLabsClient} FryLabs kliens instance
 */
function getFryLabsClient(options = {}) {
    if (!clientInstance) {
        clientInstance = new FryLabsClient(options);
    } else if (Object.keys(options).length > 0) {
        clientInstance.updateConfig(options);
    }
    return clientInstance;
}

/**
 * Új FryLabs kliens létrehozása (nem singleton)
 * @param {Object} options - Konfiguráció
 * @returns {FryLabsClient} Új FryLabs kliens instance
 */
function createFryLabsClient(options = {}) {
    return new FryLabsClient(options);
}

module.exports = {
    FryLabsClient,
    getFryLabsClient,
    createFryLabsClient,
};
