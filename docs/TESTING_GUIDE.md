# Testing Guide - MULTIPLE_TEXT Feature

## Tesztelési Forgatókönyvek

### 1. Alap MULTIPLE_TEXT Teszt

**Teszt Kérdés:** Bármilyen kérdés amely 2+ text input mezőt tartalmaz

**Elvárt Viselkedés:**
1. ✅ Script felismeri hogy MULTIPLE_TEXT típus
2. ✅ Console log: `"Question Type: [MULTIPLE_TEXT]"` jelenik meg
3. ✅ GPT-nek elküldi: `answerFieldsCount: N` az options-ban
4. ✅ GPT válasza: `{ type: "MULTIPLE_TEXT", correctAnswers: [...] }`
5. ✅ Mezők kitöltődnek sorban
6. ✅ Minden mező kap `input` és `change` event-et

**Console Ellenőrzés:**
```javascript
// Keresd ezeket a console-ban:
"Question clicked: ..."
"Full Prompt Sent to GPT: ..." // Ellenőrizd hogy tartalmazza: "This question has N separate answer fields"
"GPT Response: { type: 'MULTIPLE_TEXT', correctAnswers: [...] }"
```

---

### 2. Edge Case: Kevesebb Válasz Mint Mező

**Szimuláció:** GPT csak 2 választ ad, de 4 mező van

**Elvárt Viselkedés:**
- ✅ Első 2 mező kitöltődik
- ✅ 3-4. mező üres marad
- ✅ **NINCS error vagy crash**
- ✅ Console-ban nincs error, max warning

---

### 3. Edge Case: Több Válasz Mint Mező

**Szimuláció:** GPT 5 választ ad, de csak 3 mező van

**Elvárt Viselkedés:**
- ✅ Első 3 mező kitöltődik
- ✅ 4-5. válasz ignorálva
- ✅ **NINCS error vagy crash**

---

### 4. Edge Case: Null/Undefined Response

**Szimuláció:** GPT rossz formátumú választ ad vagy hiba történik

**Tesztelendő Válaszok:**
```javascript
// 1. correctAnswers null
{ type: "MULTIPLE_TEXT", correctAnswers: null }

// 2. correctAnswers string (helyett array)
{ type: "MULTIPLE_TEXT", correctAnswers: "single answer" }

// 3. Teljesen üres
{}

// 4. Csak answer van
{ answer: "something" }
```

**Elvárt Viselkedés:**
- ✅ Mindegyik esetben: **NINCS crash**
- ✅ Console warning lehet: `"No valid answers in GPT response for MULTIPLE_TEXT"`
- ✅ String esetén: [1 mező kitöltődik]
- ✅ Null/üres esetén: mezők üresek maradnak

---

### 5. Backward Compatibility Teszt

**Teszt:** Egyszerű TEXT kérdés (1 text input)

**Elvárt Viselkedés:**
- ✅ Felismeri mint `AnswerType.TEXT` (NEM MULTIPLE_TEXT!)
- ✅ Régi kód path fut
- ✅ Minden működik mint eddig

**Teszt:** RADIO/CHECKBOX/SELECT kérdések

**Elvárt Viselkedés:**
- ✅ Semmi változás a működésben
- ✅ Ugyanúgy működnek mint előtte

---

### 6. Clipboard Copy Teszt

**Konfigurációban:** `copyResults: true`

**MULTIPLE_TEXT esetén:**

**Elvárt Vágólap Formátum:**
```
Question: [A kérdés szövege]
Type: MULTIPLE_TEXT
Answers:
Field 1: [válasz1]
Field 2: [válasz2]
Field 3: [válasz3]
```

**Values Only Formátum:**
```
[válasz1]
[válasz2]
[válasz3]
```

---

### 7. DOM Manipulation Edge Cases

**Teszt Forgatókönyvek:**

1. **Input elem `value` property nem létezik**
   - Szimuláció: Read-only vagy disabled mező
   - Elvárt: Skip, console warning, **nincs crash**

2. **dispatchEvent dob exception**
   - Szimuláció: Detached DOM element
   - Elvárt: Warning, **folytatás a következő mezővel**

3. **Element null/undefined**
   - Szimuláció: DOM változott közben
   - Elvárt: Skip az elem, **nincs crash**

---

## Debug Console Commandok

### Ellenőrizd a típus felismerést:
```javascript
// Böngésző console-ban:
document.querySelectorAll('.answer input[type="text"]').length
// Ha > 1, akkor MULTIPLE_TEXT-nek kéne lennie
```

### Szimuláld a GPT választ:
```javascript
// Manuálisan teszteld a response handling-et:
const mockResponse = {
    type: "MULTIPLE_TEXT",
    correctAnswers: ["test1", "test2", "test3"]
};
console.log(mockResponse);
```

### Ellenőrizd az AnswerType enum-ot:
```javascript
// Tampermonkey script console-jában:
console.log(AnswerType);
// Kimenet: { CHECKBOX: 'checkbox', RADIO: 'radio', TEXT: 'text', SELECT: 'select', MULTIPLE_TEXT: 'MULTIPLE_TEXT' }
```

---

## Regression Teszt Checklist

Tesztelés után ellenőrizd:

- [ ] Egyszerű TEXT kérdések működnek (1 mező)
- [ ] RADIO kérdések működnek
- [ ] CHECKBOX kérdések működnek  
- [ ] SELECT kérdések működnek
- [ ] MULTIPLE_TEXT kérdések működnek (2+ mező)
- [ ] Clipboard copy működik minden típusnál
- [ ] RAG működik (ha engedélyezve)
- [ ] Nincsenek console errorok
- [ ] Events triggere-lődnek (Moodle észleli a változásokat)

---

## Known Issues / Limitációk

1. **Label felismerés:** Jelenleg a mezők nem kapnak külön label-eket, csak sorszámot (`Field 1, Field 2`)
2. **Validáció:** Nincs mező-specifikus validáció (pl. email, szám formátum)
3. **Re-order:** Ha a DOM sorrend változik, a kitöltés sorrendje is változhat

---

## Production Checklist

Éles használat előtt:

- [ ] Legalább 5 különböző MULTIPLE_TEXT kérdés tesztelve
- [ ] Edge case-ek manuálisan tesztelve (null, string, empty)
- [ ] Backward compatibility ellenőrizve (régi kérdések működnek)
- [ ] Console clean (nincs error production-ben)
- [ ] User feedback gyűjtése (mezők tényleg kitöltődnek?)
- [ ] Különböző böngészőkön tesztelve (Chrome, Firefox, Edge)

---

## Ha Problémát Találsz

1. **Console-t nyisd ki** (F12)
2. **Nézd meg a hibaüzenetet**
3. **Ellenőrizd:**
   - Mi volt a kérdés típusa? (AnswerType)
   - Mennyi mező volt?
   - Mit válaszolt a GPT?
   - Melyik lépésnél állt meg?

4. **Gyűjtsd össze:**
   - Console log output
   - Kérdés HTML struktúrája
   - GPT response JSON
   - Expected vs Actual behavior

5. **Report:**
   - GitHub issue-ban dokumentáld
   - Mellékeld a fenti információkat
