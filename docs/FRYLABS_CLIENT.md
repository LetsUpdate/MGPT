# FryLabs Client Dokumentáció

## Áttekintés

A `frylabsClient.js` modul egy professzionális, production-ready kliens a FryLabs API-hoz. A modul felelős a kérdések lekérdezéséért a FryLabs adatbázisból, automatikus failover-rel, retry mechanizmussal és caching támogatással.

## Főbb Tulajdonságok

### ✅ Failsafe Funkciók

- **Multi-server Support**: Több FryLabs szerver beállítása prioritási sorrendben
- **Automatic Failover**: Ha egy szerver nem elérhető, automatikusan a következővel próbálkozik
- **Retry Mechanism**: Konfiguálható újrapróbálkozás hiba esetén exponenciális backoff-fal
- **Timeout Management**: Beállítható timeout minden kéréshez
- **Error Handling**: Részletes hibakezelés és logging

### 🚀 Performance Optimalizáció

- **Response Caching**: Beépített cache rendszer a válaszok tárolására (TTL alapú)
- **Batch Queries**: Több kérdés párhuzamos lekérdezése
- **Cache Size Limiting**: Automatikus cache méret limitálás (max 1000 elem)

### 📊 Monitoring & Debug

- **Statistics Tracking**: Részletes statisztikák a kérésekről és válaszokról
- **Server Health Check**: Szerverek állapotának ellenőrzése
- **Debug Mode**: Részletes debug információk a működésről

## Konfiguráció

### Config.js Beállítások

```javascript
const config = {
    // FryLabs Configuration
    FRYLABS_KEY: '',              // API kulcs (opcionális)
    FRYLABS_URLS: [               // Szerverek listája prioritási sorrendben
        'https://frylabs1.example.com/api',
        'https://frylabs2.example.com/api',
    ],
    FRYLABS_TIMEOUT: 15000,       // Timeout milliszekundumban
    FRYLABS_RETRY_COUNT: 2,       // Újrapróbálkozások száma
};
```

### Runtime Konfiguráció

```javascript
const { getFryLabsClient } = require('./frylabsClient');

// Singleton instance default konfigurációval
const client = getFryLabsClient();

// Vagy custom konfigurációval
const customClient = getFryLabsClient({
    apiKey: 'your-api-key',
    urls: ['https://server1.com', 'https://server2.com'],
    timeout: 20000,
    retryCount: 3,
    cacheEnabled: true,
    cacheTTL: 7200000, // 2 óra
});

// Vagy új instance (nem singleton)
const { createFryLabsClient } = require('./frylabsClient');
const newClient = createFryLabsClient({ /* config */ });
```

## Használat

### Egyszerű Kérdés Lekérdezése

```javascript
const { getFryLabsClient } = require('./frylabsClient');
const client = getFryLabsClient();

async function getAnswer() {
    const result = await client.queryQuestion(
        'Mi a válasz a kérdésre?',
        {
            subject: 'Matematika',
            testUrl: 'https://example.com/test/123',
            possibleAnswers: ['A', 'B', 'C', 'D']
        }
    );

    if (result) {
        console.log('Válasz találva:', result);
    } else {
        console.log('Nincs válasz az adatbázisban');
    }
}
```

### Több Kérdés Lekérdezése (Batch)

```javascript
const questions = [
    {
        question: 'Első kérdés?',
        subject: 'Fizika',
        possibleAnswers: ['A', 'B']
    },
    {
        question: 'Második kérdés?',
        subject: 'Kémia'
    },
    'Harmadik kérdés?' // Egyszerű string is lehet
];

const results = await client.queryQuestions(questions);
results.forEach((result, index) => {
    if (result) {
        console.log(`Kérdés ${index + 1}: Válasz találva`);
    } else {
        console.log(`Kérdés ${index + 1}: Nincs válasz`);
    }
});
```

### Szerverek Ellenőrzése

```javascript
// Egy szerver health check
const isHealthy = await client.checkServerHealth('https://server1.com');
console.log('Szerver elérhető:', isHealthy);

// Összes szerver ellenőrzése
const serverStatus = await client.checkAllServers();
serverStatus.forEach(s => {
    console.log(`${s.url}: ${s.isHealthy ? 'OK' : 'HIBA'}`);
});
```

### Statisztikák

```javascript
const stats = client.getStats();
console.log('Statisztikák:', stats);
// Output:
// {
//   totalRequests: 100,
//   successfulRequests: 85,
//   failedRequests: 15,
//   cacheHits: 30,
//   serverErrors: { 'https://server1.com': 5 },
//   cacheSize: 50,
//   successRate: '85.00%'
// }
```

### Cache Kezelés

```javascript
// Cache törlése
client.clearCache();

// Cache kikapcsolása/bekapcsolása runtime-ban
client.updateConfig({ cacheEnabled: false });
```

### Debug Információk

```javascript
client.debug();
// Output:
// [FryLabs] Debug információk:
//   API Key: your-api-k...
//   URLs: ['https://server1.com', 'https://server2.com']
//   Timeout: 15000 ms
//   Retry Count: 2
//   Cache enabled: true
//   Cache size: 45
//   Stats: { ... }
```

## API Válasz Formátumok

A FryLabs kliens többféle válasz formátumot támogat:

### Sikeres Válasz

```javascript
{
    found: true,
    answer: {
        type: 'text',
        content: 'Ez a válasz',
        confidence: 0.95
    }
}
```

vagy

```javascript
{
    answers: [
        {
            q: { Q: 'Kérdés', A: 'Válasz' },
            match: 100,
            detailedMatch: { ... }
        }
    ]
}
```

### Nincs Találat

```javascript
{
    found: false,
    answer: null
}
```

## Integráció a MoodleGPT-be

A későbbi integráció során a FryLabs kliens így fog működni a kérdés-válasz folyamatban:

```javascript
// Jövőbeli integráció (még nincs bekötve)
async function answerQuestion(question, options) {
    // 1. Próbáljuk meg a FryLabs-ból
    const fryLabsAnswer = await fryLabsClient.queryQuestion(question, options);
    
    if (fryLabsAnswer && fryLabsAnswer.found) {
        console.log('Válasz a FryLabs adatbázisból');
        return fryLabsAnswer.answer;
    }
    
    // 2. Ha nincs találat, használjuk a ChatGPT-t
    console.log('Nincs FryLabs találat, ChatGPT használata');
    const gptAnswer = await askChatGPT(question, options);
    return gptAnswer;
}
```

## Error Handling

A kliens automatikusan kezeli a következő hibákat:

- **Network Errors**: Hálózati kapcsolat problémák
- **Timeout Errors**: Túl lassú válasz
- **Invalid Response**: Hibás JSON vagy formátum
- **Server Errors**: HTTP 5xx hibák
- **Invalid Configuration**: Hibás URL-ek vagy hiányzó konfiguráció

Minden hiba esetén részletes log üzenet jelenik meg a konzolban.

## Best Practices

1. **API Key Kezelés**: Soha ne commitold az API kulcsot a kódba, használj environment variable-t vagy config file-t
2. **URL Prioritás**: A legmegbízhatóbb szervert tedd az első helyre a FRYLABS_URLS tömbben
3. **Cache TTL**: Állítsd be a cache TTL-t az adatok frissességi igénye szerint
4. **Retry Count**: Ne állíts be túl magas retry count-ot, mert lassíthatja a rendszert
5. **Monitoring**: Rendszeresen ellenőrizd a statisztikákat és a szerver health-et

## Hibaelhárítás

### Nincsenek válaszok

1. Ellenőrizd, hogy a FRYLABS_URLS megfelelően van-e beállítva
2. Futtass health check-et: `client.checkAllServers()`
3. Nézd meg a statisztikákat: `client.getStats()`
4. Engedélyezd a debug mode-ot: `client.debug()`

### Lassú válaszidők

1. Csökkentsd a timeout értékét
2. Csökkentsd a retry count-ot
3. Növeld a cache TTL-t
4. Távolítsd el a nem elérhető szervereket az URL listából

### Cache problémák

1. Töröld a cache-t: `client.clearCache()`
2. Kapcsold ki a cache-t teszteléshez: `client.updateConfig({ cacheEnabled: false })`

## Tesztelés

```javascript
// Egyszerű teszt
async function testFryLabsClient() {
    const client = getFryLabsClient({
        urls: ['https://test-server.com/api']
    });
    
    // Health check
    const servers = await client.checkAllServers();
    console.log('Szerverek:', servers);
    
    // Teszt kérdés
    const result = await client.queryQuestion('Teszt kérdés?');
    console.log('Eredmény:', result);
    
    // Statisztikák
    console.log('Stats:', client.getStats());
}
```

## Jövőbeli Fejlesztések

- [ ] Websocket támogatás real-time frissítésekhez
- [ ] Persistent cache (localStorage/IndexedDB)
- [ ] Request queueing és rate limiting
- [ ] Automatic server ranking based on performance
- [ ] Metrics export (Prometheus formátum)

## Licenc

Ugyanaz, mint a MoodleGPT projekt.
