const config = {
    API_URL: 'https://api.openai.com/v1/chat/completions',
    
    // FryLabs Configuration
    FRYLABS_KEY: '',  // API kulcs a FryLabs szolgáltatáshoz
    FRYLABS_URLS: [   // FryLabs szerverek (prioritási sorrendben)
        // 'https://frylabs.example.com/api',
        // 'https://frylabs2.example.com/api',
    ],
    FRYLABS_TIMEOUT: 15000,  // Timeout milliszekundumban (15 másodperc)
    FRYLABS_RETRY_COUNT: 2,  // Újrapróbálkozások száma hiba esetén
    
    // NOTE: SYSTEM_PROMPT is now dynamically generated per question type
    // See: src/systemPromptGenerator.js for type-specific prompts
};
//config.API_URL = 'http://localhost:8000/api/v1/assist';
module.exports = config;