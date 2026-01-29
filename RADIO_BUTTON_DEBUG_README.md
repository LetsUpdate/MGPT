# Radio Button Kiválasztás - Debug Verzió

## Mi a probléma?

Jelentetted, hogy a radio button kiválasztás nem működik:
- Rákattintasz a kérdésre ✅
- GPT megoldja a kérdést ✅  
- **DE:** A radio button nem lesz automatikusan kiválasztva ❌

## Mit csináltam?

### 1. Részletes naplózást adtam hozzá

Most minden lépés a konzolba van írva, így pontosan látható, hogy mi történik:

**Amit most látsz a konzolban:**
- Mi a GPT válasza
- Milyen indexet számolt ki a kód
- Melyik radio button van kiválasztva
- Sikeres volt-e a kiválasztás
- Mi az oka, ha nem működik

### 2. Több eseményt küldök

Előtte csak `change` eseményt küldtem. Most három különböző eseményt is:
- `change` - változás esemény
- `click` - kattintás esemény (mintha rákattintanál)
- `input` - beviteli esemény

Ez segíthet, ha a Moodle speciális eseménykezelőket használ.

### 3. Hibaelhárítási útmutatót készítettem

A `docs/RADIO_BUTTON_TROUBLESHOOTING.md` fájl tartalmazza:
- Lépésről lépésre útmutatót
- Gyakori problémák és megoldásaik
- Manuális tesztelési kódokat
- Hibák jelentésének sablonját

## Hogyan használd?

### 1. Telepítsd az új verziót

Töltsd le és telepítsd a frissített userscript-et.

### 2. Nyisd meg a konzolt

**Chrome/Edge:** Nyomd meg az `F12` vagy `Ctrl+Shift+J`
**Firefox:** Nyomd meg az `F12` vagy `Ctrl+Shift+K`

### 3. Kattints egy kérdésre

Kattints rá egy olyan kérdésre, ahol nem működik a kiválasztás.

### 4. Nézd meg a konzol üzeneteket

#### ✅ Ha MŰKÖDIK, ezt látod:

```
Question clicked: Mi a helyes válasz?
GPT Response: {correctAnswers: [0], type: "radio"}
toIndex: Converting answer: 0 type: number
toIndex: Numeric answer, idx= 0 valid= true elems.length= 4
RADIO DEBUG: gptResponse.correctAnswers = [0]
RADIO DEBUG: Calculated radioIdx = 0
RADIO DEBUG: Attempting to select radio button at index 0
RADIO DEBUG: Unchecking radio 0, current checked=false
RADIO DEBUG: Unchecking radio 1, current checked=false
RADIO DEBUG: Unchecking radio 2, current checked=false
RADIO DEBUG: Unchecking radio 3, current checked=false
RADIO DEBUG: Setting checked=true on element
RADIO DEBUG: After setting checked, value is: true
RADIO DEBUG: Events dispatched
RADIO DEBUG: Verification after 100ms - element checked: true ✅
```

#### ❌ Ha NEM MŰKÖDIK, valami ilyesmit látsz:

**Példa 1: GPT nem ad vissza jó választ**
```
GPT Response: {answer: "Helyes válasz", correctAnswers: undefined}
RADIO DEBUG: gptResponse.correctAnswers = undefined
toIndex: Converting answer: undefined type: undefined
toIndex: Answer is null/undefined, returning -1
RADIO DEBUG: Calculated radioIdx = -1
RADIO DEBUG: Cannot select - radioIdx: -1 element exists: false
```

**Példa 2: Index nem megfelelő**
```
toIndex: Converting answer: "Válasz A" type: string
toIndex: Text answer, searching for: válasz a
toIndex: Available answers: ["válasz b", "válasz c", "válasz d"]
toIndex: Found at index: -1
RADIO DEBUG: Calculated radioIdx = -1
```

**Példa 3: Kiválasztás nem marad meg**
```
RADIO DEBUG: Setting checked=true on element
RADIO DEBUG: After setting checked, value is: true
RADIO DEBUG: Events dispatched
RADIO DEBUG: Verification after 100ms - element checked: false ❌
```

### 5. Jelentsd a hibát

Másodd ki a **TELJES** konzol kimenetét és küldd el nekem, beleértve:
- Minden `RADIO DEBUG:` üzenetet
- Minden `toIndex:` üzenetet
- Az `GPT Response:` sort
- Minden hibaüzenetet

**Opcionálisan hasznos:**
- Screenshot a Moodle kérdésről
- A kérdés HTML kódja (lásd lentebb)
- Moodle verziószám

## Manuális teszt

Ha meg akarod nézni, hogy manuálisan működik-e, írd be ezt a konzolba:

```javascript
// Keress rá az összes radio buttonra
const radios = document.querySelectorAll('input[type="radio"]');
console.log('Talált radio buttonok:', radios.length);

// Válaszd ki az elsőt manuálisan
radios[0].checked = true;
radios[0].dispatchEvent(new Event('change', { bubbles: true }));

// Ellenőrizd 1 másodperc múlva
setTimeout(() => {
    console.log('Még mindig ki van választva?', radios[0].checked);
}, 1000);
```

Ha ez sem működik → **Moodle-specifikus probléma**, nem a kód hibája.

## Kérdés HTML kódjának lekérése

Ha kell, így tudod kimásolni a kérdés HTML-jét:

```javascript
const questionDiv = document.querySelector('.que');
console.log(questionDiv.outerHTML);
```

Majd másold ki a konzolból.

## Gyakori megoldások

### Probléma: "Cannot select - radioIdx: -1"

**Oka:** GPT nem adott vissza helyes indexet vagy szöveget.

**Megoldás:**
1. Ellenőrizd a `GPT Response` sort
2. Váltsd át a modellt (pl. gpt-4o helyett gpt-4-turbo)
3. Nézd meg a system promptot

### Probléma: "Verification... element checked: false"

**Oka:** Moodle JavaScript felülírja a kiválasztást.

**Megoldás:**
1. Próbáld manuálisan is → ha az sem működik, Moodle bug
2. Frissítsd az oldalt
3. Várj pár másodpercet a betöltés után

### Probléma: Néha működik, néha nem

**Oka:** Időzítési probléma - a DOM még nem kész.

**Megoldás:**
1. Várj 1-2 másodpercet a kérdés betöltése után
2. Kapcsold ki az auto-solve-t
3. Kattints egyesével a kérdésekre

## További segítség

Részletes hibaelhárítási útmutató (angolul):
- `docs/RADIO_BUTTON_TROUBLESHOOTING.md`

Vagy írj nekem a teljes konzol kimenettel!

---

## English Summary

### What was added:

1. **Comprehensive debug logging** for radio button selection process
2. **Enhanced event dispatching** - added `click` and `input` events
3. **Verification check** - confirms selection after 100ms
4. **Detailed troubleshooting guide** in `docs/RADIO_BUTTON_TROUBLESHOOTING.md`

### How to use:

1. Install updated userscript
2. Open browser console (F12)
3. Click on a question
4. Check console output for `RADIO DEBUG:` messages
5. Report findings with full console log

### What the logs reveal:

- ✅ GPT response format and content
- ✅ Index calculation process
- ✅ Element selection process
- ✅ Event dispatching confirmation
- ✅ Selection persistence verification
- ❌ Exact point of failure if something goes wrong

The debug output will pinpoint exactly where and why the radio button selection is failing.
