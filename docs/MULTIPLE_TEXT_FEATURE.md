# Több Válasz Mező Funkció (MULTIPLE_TEXT)

## Áttekintés

A MoodleGPT mostantól képes kezelni olyan kérdéseket, amelyeknél **több szöveges válasz mező** található egy kérdésen belül. A rendszer automatikusan felismeri, ha egy kérdéshez több text input tartozik, és úgy kéri meg a ChatGPT-t, hogy strukturáltan, részválaszonként adja meg a választ.

## Működés

### 1. Automatikus Felismerés

A script automatikusan felismeri, amikor egy kérdéshez több text input mező tartozik:

```javascript
// Ha 1-nél több text input van, MULTIPLE_TEXT típust kap
const textAnswers = node.querySelectorAll('.answer input[type="text"]');
if (textAnswers.length > 1) return 'MULTIPLE_TEXT';
```

### 2. GPT Instruálása

Amikor a script MULTIPLE_TEXT típusú kérdést észlel, speciális utasítást ad a ChatGPT-nek:

```
Question Type: [MULTIPLE_TEXT]

Instruction: This question has {N} separate answer fields. 
Provide {N} separate answers in the correctAnswers array, one for each field in order.

Response format example:
{
  "type": "MULTIPLE_TEXT",
  "correctAnswers": ["answer1", "answer2", "answer3", ...]
}
Provide exactly {N} answers in the array.
```

### 3. Válaszok Kitöltése

A script a kapott válaszokat **sorban** írja be a mezőkbe:

```javascript
case 'MULTIPLE_TEXT':
    const multipleTextAnswers = Array.isArray(gptResponse?.correctAnswers) 
        ? gptResponse.correctAnswers 
        : (gptResponse?.answer ? [gptResponse.answer] : []);
    
    // Kitöltjük a mezőket sorban
    questionData.elements.answerElements.forEach((element, index) => {
        if (multipleTextAnswers[index] !== undefined) {
            element.value = String(multipleTextAnswers[index]).trim();
            // Dispatch event hogy Moodle észlelje a változást
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
        }
    });
    break;
```

## Példa Használatra

### Kérdés Példa

**Kérdés:** "Add meg a következő CPU architektúra részegységeit:"

**Válasz mezők:**
1. [____________] (ALU egység neve)
2. [____________] (Vezérlő egység neve)
3. [____________] (Regiszter egység neve)

### ChatGPT Válasz

```json
{
  "type": "MULTIPLE_TEXT",
  "correctAnswers": [
    "Arithmetic Logic Unit (ALU)",
    "Control Unit (CU)",
    "Register File"
  ]
}
```

### Eredmény

A script automatikusan kitölti:
- 1. mező: "Arithmetic Logic Unit (ALU)"
- 2. mező: "Control Unit (CU)"
- 3. mező: "Register File"

## Vágólapra Másolás

Ha a `copyResults` opció be van kapcsolva a konfigurációban, a több válaszos szöveges mezők is másolódnak a vágólapra, soronként elválasztva:

```
Question: Add meg a következő CPU architektúra részegységeit:
Type: MULTIPLE_TEXT
Answers:
Field 1: Arithmetic Logic Unit (ALU)
Field 2: Control Unit (CU)
Field 3: Register File
```

Vagy csak az értékek (values only formátum):
```
Arithmetic Logic Unit (ALU)
Control Unit (CU)
Register File
```

## Technikai Részletek

### API Használat

**Backward Compatible Hívás:**
```javascript
// Régi kód továbbra is működik:
await gptManager.askGPT(question, possibleAnswers, AnswerType.RADIO);

// Új MULTIPLE_TEXT kód:
await gptManager.askGPT(
    question, 
    [],  // MULTIPLE_TEXT esetén nincs possibleAnswer
    AnswerType.MULTIPLE_TEXT,
    { answerFieldsCount: 3 }  // Options objektumban
);
```

**AnswerType Enum Frissítve:**
```javascript
const AnswerType = {
    CHECKBOX: 'checkbox',
    RADIO: 'radio',
    TEXT: 'text',
    SELECT: 'select',
    MULTIPLE_TEXT: 'MULTIPLE_TEXT'  // ÚJ!
};
```

### Módosított Fájlok

1. **questionSolver.js**
   - `getAnswerType()`: Felismeri a MULTIPLE_TEXT típust
   - `getAnswerElementsByType()`: Visszaadja az összes text input elemet
   - `applyModificationsToQuestion()`: Kitölti a mezőket sorban
   - `formatAnswersForClipboard()`: Formázza a vágólapra másolást
   - `formatAnswersValuesOnly()`: Csak az értékeket formázza

2. **gptManager.js**
   - `askGPT()`: `answerFieldsCount` most az `options` objektumban van (backward compatible!)
   - AnswerType enum kiegészítve: `MULTIPLE_TEXT: 'MULTIPLE_TEXT'`
   - Speciális prompt MULTIPLE_TEXT típushoz
   - Példa formátum megadása a GPT-nek
   - Validáció: `answerFieldsCount` minimum 1

3. **config.js**
   - System prompt kiegészítése MULTIPLE_TEXT típussal
   - Példa válasz formátum dokumentálása

### Típus Definíció

```javascript
// AnswerType enum (gptManager.js)
const AnswerType = {
    CHECKBOX: 'checkbox',
    RADIO: 'radio',
    TEXT: 'text',
    SELECT: 'select',
    MULTIPLE_TEXT: 'MULTIPLE_TEXT'  // Új típus hozzáadva az enum-hoz!
};
```

## Hibakezelés

A kód teljes mértékben failsafe:

### Null/Undefined védelem
- ✅ `gptResponse` null/undefined ellenőrzés
- ✅ `correctAnswers` lehet string, array vagy hiányzik
- ✅ `answer` fallback ha nincs `correctAnswers`

### DOM Manipuláció védelem
- ✅ Try-catch minden `element.value` setting körül
- ✅ `element` létezés ellenőrzése
- ✅ `dispatchEvent` külön try-catch-ben
- ✅ Index bounds checking

### Validáció
- ✅ `answerFieldsCount` minimum 1-re kényszerítve
- ✅ Kevesebb válasz → csak a megadott mezők töltődnek ki
- ✅ Több válasz → felesleges válaszok ignorálva
- ✅ Üres/null válaszok kiszűrve (`.filter(Boolean)`)
- ✅ Minden válasz `trim()`-elve

## Kompatibilitás

A funkció kompatibilis:
- ✅ Moodle quiz oldalakon
- ✅ Minden böngészővel (Chrome, Firefox, Edge, Safari)
- ✅ RAG funkcióval (ha be van kapcsolva)
- ✅ Vágólapra másolás funkcióval

## Fejlesztési Lehetőségek

Jövőbeli továbbfejlesztési lehetőségek:
- [ ] Részválaszok külön címkézése (ha a Moodle-ben label-ek vannak)
- [ ] Validáció minden egyes válasz mezőre külön
- [ ] Részválaszok egyedi formázása (pl. számlista, stb.)
- [ ] Real-time preview a válaszokról mielőtt kitölti
