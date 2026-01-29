# Radio Button Selection Troubleshooting Guide

## Problem: Radio buttons not being selected automatically

Ha a normál életciklus nem működik (rányomsz a kérdésre → GPT megoldja → automatikusan kiválasztja a radio gombot), akkor ez az útmutató segít megtalálni a problémát.

### Normal Lifecycle (Normál Működés)

1. ✅ Rákattintasz a kérdésre
2. ✅ A kérdés adatai el vannak küldve a GPT-nek
3. ✅ GPT visszaadja a választ (index vagy szöveg formában)
4. ✅ A kód kiszámolja a helyes radio button indexét
5. ✅ A radio button automatikusan ki van választva
6. ✅ Moodle észleli a változást

### Debugging Steps (Hibakeresési Lépések)

#### 1. Nyisd meg a böngésző konzolt
- **Chrome/Edge:** F12 vagy Ctrl+Shift+J
- **Firefox:** F12 vagy Ctrl+Shift+K
- **Safari:** Cmd+Option+C

#### 2. Kattints egy kérdésre

#### 3. Nézd meg a console log üzeneteket

Keress az alábbi mintázatok után:

##### ✅ Normál működés esetén:
```
Question clicked: Mi a helyes válasz?
GPT Response: {correctAnswers: [0], type: "radio"}
toIndex: Converting answer: 0 type: number
toIndex: Numeric answer, idx= 0 valid= true elems.length= 4
RADIO DEBUG: gptResponse.correctAnswers = [0]
RADIO DEBUG: Calculated radioIdx = 0
RADIO DEBUG: Attempting to select radio button at index 0
RADIO DEBUG: Setting checked=true on element
RADIO DEBUG: After setting checked, value is: true
RADIO DEBUG: Verification after 100ms - element checked: true
```

##### ❌ Ha valami nem működik:

**1. GPT nem ad vissza helyes formátumot:**
```
GPT Response: {answer: "Válasz A", correctAnswers: undefined}
RADIO DEBUG: gptResponse.correctAnswers = undefined
toIndex: Converting answer: undefined type: undefined
toIndex: Answer is null/undefined, returning -1
RADIO DEBUG: Calculated radioIdx = -1
RADIO DEBUG: Cannot select - radioIdx: -1
```

**Megoldás:** GPT modell hibásan válaszol, próbáld meg:
- Másik modellt választani (gpt-4o helyett gpt-4-turbo)
- API kulcs ellenőrzése
- System prompt ellenőrzése

**2. Index számítás hibás:**
```
toIndex: Converting answer: "Válasz A" type: string
toIndex: Text answer, searching for: válasz a
toIndex: Available answers: ["válasz b", "válasz c", "válasz d"]
toIndex: Found at index: -1
RADIO DEBUG: Calculated radioIdx = -1
```

**Megoldás:** GPT által visszaadott szöveg nem egyezik pontosan a válaszokkal
- Szóközök eltérése
- Írásjelek különböznek
- Kis/nagybetű (már case-insensitive, de érdemes ellenőrizni)

**3. Radio button elemek nem találhatók:**
```
RADIO DEBUG: elems (answer elements) = []
RADIO DEBUG: Cannot select - radioIdx: 0 element exists: false
```

**Megoldás:** A válasz elemek nincsenek megfelelően detektálva
- Moodle verzió változott
- Szokatlan HTML struktúra
- JavaScript még nem töltötte be az elemeket

**4. Element létezik, de nem válik ki:**
```
RADIO DEBUG: Setting checked=true on element <input type="radio">
RADIO DEBUG: After setting checked, value is: true
RADIO DEBUG: Verification after 100ms - element checked: false
```

**Megoldás:** Moodle JavaScript felülírja a választást
- Valószínűleg Moodle listener fut később
- Próbáld manuálisan is (esetleg ugyanaz a probléma)
- Lehet Moodle verzió-specifikus probléma

### Common Issues & Solutions (Gyakori Problémák és Megoldások)

#### Probléma: "Cannot select - radioIdx: -1"

**Okok:**
1. GPT nem ad vissza `correctAnswers` értéket
2. GPT visszaadott érték nem konvertálható indexre
3. Szöveges válasz nem egyezik a lehetőségekkel

**Megoldás:**
1. Ellenőrizd a GPT választ: `console.log(gptResponse)`
2. Nézd meg az elérhető válaszokat: elems és answersData
3. Javítsd a system promptot, hogy GPT indexet adjon vissza (0, 1, 2, stb.)

#### Probléma: Element checked=true, de vizuálisan nincs kiválasztva

**Okok:**
1. Moodle saját JavaScript felülírja
2. CSS probléma
3. Event nem triggereződik megfelelően

**Megoldás:**
1. Próbáld manuálisan kiválasztani ugyanazt → ha az sem működik, Moodle probléma
2. Ellenőrizd, hogy a `change` event triggereződik-e
3. Próbáld újratölteni az oldalt

#### Probléma: Néha működik, néha nem

**Okok:**
1. Timing issue - DOM még nem kész
2. Moodle AJAX késleltetés
3. Több kérdés párhuzamos feldolgozása

**Megoldás:**
1. Várj pár másodpercet a kérdés betöltése után
2. Kapcsold ki az auto-solve-t és egyesével kattints
3. Frissítsd az oldalt és próbáld újra

### Advanced Debugging (Haladó Hibakeresés)

#### Manuális tesztelés a konzolban:

```javascript
// 1. Keresd meg a radio buttonokat
const radios = document.querySelectorAll('input[type="radio"]');
console.log('Found radios:', radios.length);

// 2. Próbáld manuálisan kiválasztani az elsőt
radios[0].checked = true;
radios[0].dispatchEvent(new Event('change', { bubbles: true }));
console.log('Radio 0 checked:', radios[0].checked);

// 3. Ellenőrizd a DOM-ban
setTimeout(() => {
    console.log('After 1s, radio 0 checked:', radios[0].checked);
}, 1000);
```

#### Element inspekció:

```javascript
// Nézd meg egy radio button tulajdonságait
const radio = document.querySelector('input[type="radio"]');
console.log({
    type: radio.type,
    name: radio.name,
    value: radio.value,
    checked: radio.checked,
    disabled: radio.disabled,
    id: radio.id,
    className: radio.className
});
```

### Ha semmi sem működik

1. **Készíts screenshot-ot** a problémás kérdésről
2. **Másold ki a console log-ot** (minden RADIO DEBUG és toIndex üzenet)
3. **Másold ki a kérdés HTML-jét:**
   ```javascript
   const questionDiv = document.querySelector('.que');
   console.log(questionDiv.outerHTML);
   ```
4. **Jelentsd a hibát** ezekkel az információkkal

### Quick Checklist (Gyors Ellenőrző Lista)

- [ ] Konzol nyitva van
- [ ] "RADIO DEBUG:" üzenetek látszanak
- [ ] `gptResponse.correctAnswers` nem undefined
- [ ] `radioIdx` nem -1
- [ ] `elems` array nem üres
- [ ] Element létezik a számított indexnél
- [ ] `checked` értéke true a beállítás után
- [ ] Events dispatched üzenet látszik
- [ ] Verification üzenet shows checked: true

Ha mind ✅, de még mindig nem működik → Moodle-specifikus probléma, további vizsgálat szükséges.

### Report Template (Hibajelentés Sablon)

```
## Radio Button Selection Issue

**Moodle verzió:** 
**Böngésző:** 
**MGPT verzió:** 

**Console Logs:**
```
[Ide másold a teljes console log-ot]
```

**Kérdés típusa:** [multichoice / truefalse / ...]

**Mi történt:** [Leírás]

**Mi kellett volna történnie:** [Leírás]

**Screenshot:** [Ha van]
```

---

## Technical Details for Developers

### Radio Button Selection Flow

1. **Question Click** → `questionElement.addEventListener('click')`
2. **Get GPT Answer** → `gptManager.askGPT()`
3. **Parse Response** → Extract `correctAnswers` array
4. **Convert to Index** → `toIndex(correctAnswers[0])`
5. **Uncheck All** → `elems.forEach(el => el.checked = false)`
6. **Check Selected** → `elems[radioIdx].checked = true`
7. **Dispatch Events** → `change`, `click`, `input` events
8. **Verify** → Check after 100ms delay

### Code Location

File: `src/questionSolver.js`
Lines: ~715-750

### Selector Used

```javascript
this.selectors.questionNode.multipleChoice = 'input[type="radio"]'
```

Full selector:
```javascript
`${this.selectors.questionNode.answerContainer} input[type="radio"]`
// Translates to: '.answer input[type="radio"]'
```

### Event Types Dispatched

1. **change** - Standard form change event
2. **click** - Simulates user click
3. **input** - Triggers input listeners

All with `{ bubbles: true }` to propagate to parent handlers.

### Dependencies

- `gptManager.askGPT()` - Must return `{correctAnswers: [index], type: "radio"}`
- `questionData.elements.answerElements` - Must contain valid radio input elements
- `questionData.data.answers` - Must contain answer metadata with `.text` property
