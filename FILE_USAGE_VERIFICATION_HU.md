# Fájl Használat Ellenőrzése - Útmutató

## Mi az a Fájl Használat Ellenőrzés?

A Fájl Használat Ellenőrzés egy rendszer amely **konkrét bizonyítékot** nyújt arra, hogy a ChatGPT valóban használja-e a feltöltött fájlokat amikor válaszol a kérdéseidre.

### Miért fontos?

Amikor feltöltesz tananyagokat és létrehozol egy asszisztenst, biztos szeretnél lenni benne hogy:
- ✅ A ChatGPT tényleg használja a feltöltött anyagokat
- ✅ A válaszok a TE anyagaid alapján készülnek
- ✅ Nem csak általános tudásból válaszol

Ez a rendszer **láthatóvá teszi** hogy mi történik a háttérben!

---

## Hogyan Működik?

### 1. OpenAI Annotations (Megjegyzések)

Amikor a ChatGPT használ egy fájlt:
- Az OpenAI API **annotation**-öket (megjegyzéseket) ad vissza
- Ezek tartalmazzák:
  - **File ID** - Melyik fájlt használta
  - **Quoted text** - Mit idézett a fájlból
  - **Citation** - Pontos hivatkozás

### 2. Automatikus Naplózás

A rendszer automatikusan:
- Kiveszi az annotations-öket a válaszból
- Megjeleníti őket a konzolban
- Számlálja hány fájl lett használva
- Mutatja mit idézett belőlük

### 3. Konzol Üzenetek

A `[FILE_USAGE]` kategória alatt láthatod:
- ✅ Ha használta a fájlokat
- ⚠️ Ha NEM használta a fájlokat
- File ID-k
- Idézetek a fájlokból

---

## Használat - Lépésről Lépésre

### 1. Előkészítés

```
✅ Tölts fel tananyagot (PDF/TXT/DOC)
✅ Hozz létre asszisztenst a fájlokkal
✅ Engedélyezd a "Responses API" opciót
✅ Kapcsold be a "Debug Naplózás"-t
```

### 2. Konzol Megnyitása

- Nyomd meg az **F12** billentyűt
- Vagy jobb klikk → "Vizsgálat" / "Inspect" → Console

### 3. Kérdés Feltevése

- Kattints egy Moodle kérdésre
- Várd meg amíg a GPT válaszol

### 4. Konzol Ellenőrzése

Keresd ezeket az üzeneteket:
```
[FILE_USAGE] ✅ Files were consulted! Count: 2
[FILE_USAGE] Citation 1: File file-abc123 quoted: "szöveg a fájlból..."
[FILE_USAGE] Citation 2: File file-abc123 quoted: "másik idézet..."
```

---

## Konzol Üzenetek Értelmezése

### ✅ Sikeres Fájl Használat

```javascript
[INFO] [RESPONSES_API] Starting Responses API request
[INFO] [CONTEXT] Context verification {hasContext: true, fileCount: 1}
[DEBUG] [RESPONSES_API] Sending message to assistant
[INFO] [RESPONSES_API] Response received
[DEBUG] [RESPONSES_API] Annotations found: 2
[DEBUG] [RESPONSES_API] Annotation 1: {type: 'file_citation', file_id: 'file-abc123'}
[DEBUG] [RESPONSES_API] Annotation 2: {type: 'file_citation', file_id: 'file-abc123'}
[INFO] [FILE_USAGE] ✅ Files were consulted! Count: 2
[INFO] [FILE_USAGE] Citation 1: File file-abc123 quoted: "Arisztotelész természettudományos munkássága..."
[INFO] [FILE_USAGE] Citation 2: File file-abc123 quoted: "megfigyelései és kísérletei..."
[INFO] [FILE_USAGE] Total citations found: 2
```

**Mit jelent ez?**
- ✅ A ChatGPT **használta** a feltöltött fájlokat
- ✅ **2 idézetet** talált és használt
- ✅ A file-abc123 azonosítójú fájlt konzultálta
- ✅ Konkrét szövegrészeket idézett belőle

### ⚠️ Fájlok NINCSENEK Használva

```javascript
[INFO] [RESPONSES_API] Response received
[DEBUG] [RESPONSES_API] No annotations found in response
[WARN] [FILE_USAGE] ⚠️ NO files were consulted in this response
[WARN] [FILE_USAGE] Possible reasons:
  - Question answerable without file context
  - Files don't contain relevant information
  - Assistant didn't find useful content
```

**Mit jelent ez?**
- ⚠️ A ChatGPT **NEM használta** a fájlokat
- ⚠️ Nincs idézet, nincs hivatkozás
- ⚠️ Általános tudásból válaszolt

**Lehetséges okok:**
1. **A kérdés túl egyszerű** - Nincs szükség fájlra (pl. "Mi az 1+1?")
2. **A fájl nem releváns** - Nem tartalmazza a választ
3. **Rossz kulcsszavak** - A kérdés nem stimulálja a fájl keresést

---

## Példák - Működő Esetek

### Példa 1: Történelem Kérdés

**Feltöltött fájl:** tortenelem_osikorrol.pdf  
**Kérdés:** "Ki volt Arisztotelész és milyen hatása volt?"

**Konzol kimenet:**
```
[FILE_USAGE] ✅ Files were consulted! Count: 1
[FILE_USAGE] Citation 1: File file-abc123 quoted: "Arisztotelész (Kr. e. 384-322) görög filozófus..."
```

**Eredmény:** ✅ Használta a fájlt, pontos válasz az anyagból

### Példa 2: Biológia Kérdés

**Feltöltött fájl:** biologia_sejtek.pdf  
**Kérdés:** "Mi a mitokondrium funkciója?"

**Konzol kimenet:**
```
[FILE_USAGE] ✅ Files were consulted! Count: 2
[FILE_USAGE] Citation 1: File file-def456 quoted: "A mitokondrium a sejt energiatermelő..."
[FILE_USAGE] Citation 2: File file-def456 quoted: "ATP szintézis révén..."
```

**Eredmény:** ✅ 2 idézet, részletes válasz a fájlból

### Példa 3: Matematika Kérdés (Nincs fájl használat)

**Feltöltött fájl:** tortenelem_osikorrol.pdf  
**Kérdés:** "Mennyi 2+2?"

**Konzol kimenet:**
```
[FILE_USAGE] ⚠️ NO files were consulted
```

**Eredmény:** ⚠️ Nem használta a fájlt (nem releváns a történelem fájl matematikához)

---

## Hibaelhárítás

### Probléma 1: Nincs [FILE_USAGE] üzenet

**Lehetséges okok:**
- ❌ Responses API nincs bekapcsolva
- ❌ Debug naplózás ki van kapcsolva
- ❌ Nincs feltöltött fájl
- ❌ Nincs létrehozva asszisztens

**Megoldás:**
1. Config panel (Ctrl+Shift+H)
2. Ellenőrizd hogy "Responses API" be van-e pipálva
3. Ellenőrizd hogy "Debug Naplózás" be van-e kapcsolva
4. Nézd meg hogy van-e feltöltött fájl
5. Ellenőrizd hogy létezik-e asszisztens ID

### Probléma 2: Mindig ⚠️ NO files were consulted

**Lehetséges okok:**
- A kérdések túl egyszerűek
- A fájlok nem relevánsak
- Az asszisztens nem file_search tool-lal lett létrehozva

**Megoldás:**
1. **Próbálj specifikusabb kérdéseket:**
   - ❌ Rossz: "Mi ez?"
   - ✅ Jó: "Mit ír a feltöltött anyag Arisztotelészről?"

2. **Ellenőrizd a fájl tartalmát:**
   - Nyisd meg a PDF-et
   - Nézd meg hogy tartalmazza-e a választ
   - Ha nem, tölts fel releváns anyagot

3. **Újra létrehozott asszisztens:**
   - Törld a régi asszisztenst
   - Hozz létre újat "Asszisztens Létrehozása" gombbal
   - Ez biztosan file_search-el lesz felszerelve

### Probléma 3: Fájlokat használ de rossz a válasz

**Lehetséges okok:**
- A fájl nem tartalmazza a helyes választ
- Az asszisztens rosszul értelmezte
- Több kontextus kellene

**Megoldás:**
1. **Nézd meg mit idézett:**
   - Olvasd el a console-ban az idézeteket
   - Ellenőrizd hogy relevánsak-e
   - Ha nem, a fájl lehet nem tartalmazza a választ

2. **Adj több kontextust a kérdésben:**
   - ❌ Rossz: "Igaz vagy hamis?"
   - ✅ Jó: "Arisztotelész hatott a mai tudományra - igaz vagy hamis a feltöltött anyag szerint?"

3. **Tölts fel részletesebb anyagot:**
   - Ha a PDF csak tartalomjegyzék, tölts fel teljes fejezetet
   - Több fájl = több forrás = jobb válaszok

---

## Tippek és Trükkök

### ✅ Hogyan Maximalizáld a Fájl Használatot

1. **Specifikus kérdések:**
   ```
   ❌ Rossz: "Mi a válasz?"
   ✅ Jó: "A feltöltött jegyzet szerint mi Arisztotelész legfontosabb hatása?"
   ```

2. **Utalj a fájlokra:**
   ```
   ✅ "Az anyagban leírtak alapján..."
   ✅ "A feltöltött dokumentum szerint..."
   ✅ "A jegyzetben szereplő információ alapján..."
   ```

3. **Releváns anyag feltöltése:**
   ```
   ✅ PDF-ek teljes szöveggel
   ✅ Előadás jegyzetek
   ✅ Tankönyv fejezetek
   ❌ Csak képek (nem működik)
   ❌ Tartalomjegyzékek
   ```

### ✅ Ellenőrzési Checklist

Minden kérdés után ellenőrizd:
- [ ] Van-e `[FILE_USAGE]` üzenet?
- [ ] ✅ vagy ⚠️ szimbólum?
- [ ] Ha ✅, hány citation?
- [ ] Mit idézett? (olvasd el)
- [ ] Releváns-e az idézet?

---

## GYIK (Gyakran Ismételt Kérdések)

### 1. Mennyi ideig tart mire használja a fájlokat?

**Válasz:** Az OpenAI file_search tool automatikusan működik. Ha a fájl releváns, 1-2 másodpercen belül talál idézeteket. Ha 5 másodperc után sincs citation, valószínűleg nem fog használni fájlt.

### 2. Hány fájlt tudok feltölteni?

**Válasz:** Akárhányat, de az OpenAI API file_search max 20 fájlt tud egyszerre kezelni per assistant. Ha több kell, hozz létre több asszisztenst témák szerint.

### 3. Mi van ha túl sok idézet van?

**Válasz:** Ez jó jel! Azt jelenti hogy a fájlod nagyon releváns. A ChatGPT a legfontosabbakat használja fel a válaszban.

### 4. Lehet hogy használ fájlt de nincs citation?

**Válasz:** Nagyon ritkán, de előfordulhat hogy az OpenAI API nem ad vissza annotation-t. Ha a válasz nagyon specifikus és megegyezik a fájl tartalmával, valószínűleg használta.

### 5. Mi a különbség a file_citation és file_path között?

**Válasz:** 
- **file_citation** - Szöveges idézet a fájlból (ez a gyakori)
- **file_path** - Fájl elérési útvonal (ritkább, inkább code interpreternél)

### 6. Törölhetem a fájlokat miután létrehoztam az asszisztenst?

**Válasz:** ❌ NEM! Az asszisztens a fájl ID-kra hivatkozik. Ha törlöd a fájlt, nem fog tudni belőle idézni.

### 7. Működik PDF képekkel?

**Válasz:** Részben. Az OpenAI file_search csak a **szöveges** tartalmat használja. Ha a PDF csak képek (scan), akkor OCR kellene először.

### 8. Miért nem használja a fájlt amikor nyilvánvaló hogy kell?

**Lehetséges okok:**
1. A file_search tool nem lett hozzáadva az asszisztenshez
2. A fájl text content-je nem elérhető (pl. kép-alapú PDF)
3. A kérdés kulcsszavai nem stimulálják a keresést
4. Az OpenAI úgy döntött hogy a válasz nélküle is megadható

---

## Összefoglalás

### Mit tudsz most?

✅ **Látod** hogy használja-e a ChatGPT a fájlokat  
✅ **Tudod** melyik fájlt használta (file ID)  
✅ **Olvashatod** mit idézett belőle (quoted text)  
✅ **Számlálod** hány citation van  
✅ **Megérted** miért nem használt fájlt (ha nem használt)

### Konkrét Bizonyíték

Most már nem kell találgatni:
- Konzolban látod a `[FILE_USAGE]` üzeneteket
- ✅ vagy ⚠️ szimbólum egyértelmű
- File ID-k és idézetek konkrétak
- Számlálás pontos (pl. "Count: 2")

### Mit tegyél most?

1. ✅ Telepítsd a legfrissebb userscript-et
2. ✅ Tölts fel tananyagot
3. ✅ Hozz létre asszisztenst
4. ✅ Kapcsold be a Debug Naplózást
5. ✅ Nyisd meg a konzolt (F12)
6. ✅ Kérdezz valamit
7. ✅ Nézd a [FILE_USAGE] üzeneteket
8. ✅ Örülj hogy látod a bizonyítékot! 🎉

---

**Most már konkrét bizonyítékod van arra, hogy a ChatGPT használja a feltöltött fájlokat!** ✅
