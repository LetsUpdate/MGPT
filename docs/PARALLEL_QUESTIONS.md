# Párhuzamos Kérdésmegoldás Funkció

## Áttekintés

A MoodleGPT mostantól támogatja több kérdés párhuzamos megoldását, amikor egy oldalon egyszerre több kérdés található. Ez jelentősen felgyorsítja a tesztek kitöltését.

## Főbb Funkciók

### 1. Automatikus Párhuzamos Feldolgozás

Amikor az **Automatikus mód** be van kapcsolva és egy oldalon több kérdés van:
- A rendszer automatikusan felismeri az összes kérdést
- Párhuzamosan elindítja a GPT kéréseket a beállított limitig
- Minden kérdés válasza megérkezése után kitölti a választ
- Miután minden kérdés feldolgozásra került, automatikusan rákattint a "Next" gombra

### 2. Konfigurálható Limit

Új konfigurációs beállítás: **Max párhuzamos kérdések**
- Alapértelmezett érték: **10**
- Állítható 1-50 között
- Meghatározza, hogy maximum hány kérdést oldjon meg egyszerre a rendszer

## Használat

### Konfiguráció Beállítása

1. Nyisd meg a konfigurációs panelt: `Alt+Shift+C`
2. Kapcsold be az **Automatikus mód** jelölőnégyzetet
3. Állítsd be a **Max párhuzamos kérdések** értékét (opcionális, alapértelmezett: 10)
4. Kattints a **Mentés** gombra

### Példa Használat

Amikor egy Moodle tesztben több kérdés van egy oldalon (pl. 4 igaz/hamis kérdés):

```
1. kérdés: CE jelölés kötelező?
2. kérdés: Részben kész gépekre tilos CE jelölés?
3. kérdés: Gyártói felelősség hárulhat importőrre?
4. kérdés: Újból kell CE jelölést végezni változások esetén?
```

Az AutoMode bekapcsolásával:
1. Az oldal betöltése után az extension automatikusan felismeri mind a 4 kérdést
2. Párhuzamosan elindítja a GPT kéréseket (max 10 kérdésig)
3. Ahogy érkeznek a válaszok, kitölti őket
4. Miután mind a 4 kérdés megoldódott, automatikusan rákattint a "Next" gombra

## Technikai Részletek

### Módosított Fájlok

1. **src/configStore.js**
   - Új konfiguráció: `maxParallelQuestions: 10`

2. **src/questionSolver.js**
   - `isRequestInFlight` globális változó helyett `requestsInFlight` Set használata
   - Kérdésenként egyedi ID-k követése
   - Párhuzamos kérdésmegoldás támogatása a `handleMoodleQuiz()` függvényben
   - Automatikus "Next" gomb kattintás csak az összes kérdés feldolgozása után

3. **src/configPanel.js**
   - Új mező a konfigurációs felületen: "Max párhuzamos kérdések"
   - Értékmentés és betöltés támogatása

### Működési Logika

```javascript
// 1. Kérdések azonosítása
const questions = await this.getQuizData();

// 2. Limitált párhuzamos feldolgozás
const numQuestionsToSolve = Math.min(
  questions.length, 
  config.maxParallelQuestions
);

// 3. Auto-solve tracking inicializálása
this.autoSolveActive = true;
this.autoSolveTotalQuestions = questionsToSolve.length;
this.autoSolveCompletedQuestions = 0;

// 4. Párhuzamos kérések indítása
questionsToSolve.forEach((question, index) => {
  setTimeout(() => {
    question.elements.questionElement.click();
  }, index * 100); // 100ms késleltetés
});

// 5. Minden kérdés befejezése után (finally blokk):
this.autoSolveCompletedQuestions++;
this.checkAutoSolveCompletion(); // Ha minden kész, Next gomb kattintás
```

## Teljesítmény Optimalizálás

- **100ms késleltetés** van minden kérdés kattintása között, hogy ne terhelje túl a rendszert
- **Valós befejezés követés**: A rendszer pontosan követi, hogy minden GPT kérés befejeződött-e
- **500ms várakozás** a Next gomb kattintás előtt, hogy az utolsó válasz biztosan alkalmazásra kerüljön
- Csak a sikeres kérdések kerülnek feldolgozásra (`q.success`)

## Korlátok és Megjegyzések

1. **API Rate Limiting**: Nagyon sok kérdés esetén (>10) figyelj az OpenAI API rate limitjeire
2. **Hibakezelés**: Ha egy kérdés megoldása sikertelen, az is számít befejezettnek (increment a finally blokkban)
3. **Maximális limit**: A `maxParallelQuestions` beállítás korlátozza a párhuzamosan futó kéréseket

## Jövőbeli Fejlesztések

- [ ] Progresszió megjelenítés a UI-ban (X/Y kérdés megoldva)
- [ ] Hiba esetén retry mechanizmus
- [ ] Részletes naplózás és statisztikák
- [ ] Opcionális hang/vizuális jelzés a befejezéskor
