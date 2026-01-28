# Moodle GPT (MGPT)

Az **MGPT** egy AI-alapú tanulást segítő eszköz a Moodle platformhoz. A program célja, hogy mesterséges intelligencia segítségével támogassa a diákok tanulmányi előrehaladását és segítse a tananyag mélyebb megértését.

*Dobj egy csillagot hogy tudjak vele menőzni!* [⭐KaptamEgyCsillagot!!!⭐](https://coub.com/view/1uvg42)

Telepítési útmutató:
1. Első lépésként telepítsd a böngésződbe a [Tampermonkey](https://www.tampermonkey.net/) kiegészítőt, amely lehetővé teszi a JavaScript alapú szkriptek futtatását a böngésződben.
2. A szkript telepítéséhez [kattints ide](https://github.com/LetsUpdate/MGPT/releases/latest/download/MGPT.user.js). Ezután a szkript automatikusan bekerül a Tampermonkey kiegészítőbe, és már el is kezdheted használni!



##
*Ha nagyon tetszett, akár [meghívhatsz egy kávéra](https://ko-fi.com/red_official)*

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/Q5Q0O1LDA) 

koszi :P

## Hogyan használd?

### ⌨️ Menü megnyitása

A konfigurációs menü megnyitásához/bezárásához nyomd meg: **Ctrl+Shift+H** (Mac-en: **Cmd+Shift+H**)

Részletes lépésről-lépésre útmutató (menü, vágólap, API kulcs beszerzése):(gpt generated)

- Lásd: [docs/HOWTO.md](docs/HOWTO.md)

## Funkciók

### 🤖 ChatGPT Responses API & Fájl Feltöltés

MGPT támogatja a legújabb ChatGPT Responses API-t fejlett funkciókkal:
- **Fájl feltöltés** - Tölts fel PDF-eket és szöveges dokumentumokat a pontosabb válaszokért
- **Thinking modellek** - o1, o1-mini, o3 modellek gondolkodási folyamattal
- **Asszisztens mód** - Thread-alapú beszélgetések kontextussal

Részletes leírás: [docs/RESPONSES_API.md](docs/RESPONSES_API.md)

**📖 Teljes Használati Útmutató:**
- [USAGE_GUIDE.md](docs/USAGE_GUIDE.md) - Responses API teljes útmutató (document management, logging, debugging)
- [MODEL_RECOMMENDATIONS.md](docs/MODEL_RECOMMENDATIONS.md) - Modell választási útmutató akadémiai kérdésekhez

**Új Funkciók:**
- ✅ **Automatikus kvíz megoldás** feltöltött fájlokkal
- ✅ **Dokument kezelés** UI (feltöltés, törlés, megtekintés)
- ✅ **Átfogó naplózás** (debug logging, log viewer)
- ✅ **Kontextus ellenőrzés** (láthatod, hogy a ChatGPT használja-e a fájljaidat)
- ✅ **Thinking modellek** támogatása (o1, o1-mini, o3)

### ⌨️ Rövid Válasz Mód (Short Answer Mode)

Gyors shortcut-tal (**Cmd/Ctrl+Shift+S**) kapcsolható rövid válasz mód TEXT/MULTIPLE_TEXT kérdésekhez. A ChatGPT nagyon tömör, 3-5 szavas válaszokat ad. Vizuális jelző mutatja ha aktív.

Részletes leírás: [docs/SHORT_ANSWER_MODE.md](docs/SHORT_ANSWER_MODE.md)

### 🎯 Több Válasz Mező Támogatás (MULTIPLE_TEXT)

A script mostantól automatikusan felismeri, amikor egy kérdéshez **több szöveges válasz mező** tartozik, és strukturáltan, részválaszonként kéri meg a ChatGPT-t a válaszadásra. A válaszok automatikusan kitöltődnek a megfelelő mezőkbe sorrendben.

Részletes leírás: [docs/MULTIPLE_TEXT_FEATURE.md](docs/MULTIPLE_TEXT_FEATURE.md)
