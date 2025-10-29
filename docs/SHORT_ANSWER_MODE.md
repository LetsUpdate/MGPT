# Rövid Válasz Mód (Short Answer Mode)

## 🎯 Áttekintés

A **Rövid Válasz Mód** funkció lehetővé teszi, hogy a ChatGPT nagyon rövid, tömör válaszokat adjon TEXT és MULTIPLE_TEXT típusú kérdésekre. Ez különösen hasznos amikor:

- Csak egy-két szavas választ vársz
- Gyors kitöltést akarsz rövidítésekkel
- Nincs szükség hosszú magyarázatokra
- Időt akarsz spórolni az olvasással

## ⌨️ Használat

### Gyors Toggle (Shortcut)

**Cmd+Shift+S** (Mac) / **Ctrl+Shift+S** (Windows/Linux) - Be/kikapcsolja a rövid válasz módot

A shortcut platform-aware: automatikusan Cmd-t használ Mac-en, Ctrl-t Windows/Linux-on.

Használat közben bármikor megnyomhatod, azonnal vált.

### Vizuális Visszajelzés

#### 1. Indicator (Jelző)
Amikor a rövid válasz mód **AKTÍV**, a jobb felső sarokban megjelenik egy **zöld kör** 📝 emoji-val:

```
┌─────────────────────────────────┐
│                              📝 │ ← Indicator (klikkelhetően is toggle-öl)
│                                 │
│        Kérdés szövege...        │
│                                 │
└─────────────────────────────────┘
```

- ✅ **Látható**: Rövid válasz mód BE
- ❌ **Nem látható**: Rövid válasz mód KI

Az indicator-ra **kattintva** is lehet toggle-ölni (ugyanaz mint Alt+S).

#### 2. Toast Notification
Amikor kapcsolod a módot (Alt+S vagy kattintás), jobbról becsúszik egy értesítés:

```
┌──────────────────────────────────┐
│  ✓ Rövid válasz mód BEKAPCSOLVA │  ← Zöld toast
└──────────────────────────────────┘

vagy

┌──────────────────────────────────┐
│  ✗ Rövid válasz mód KIKAPCSOLVA │  ← Kék toast
└──────────────────────────────────┘
```

A toast 2 másodperc után automatikusan eltűnik.

### Config Panel Beállítás

A Config Panel-ben (Cmd/Ctrl+Shift+H) is be/ki lehet kapcsolni:

```
[ ] Rövid válaszok (TEXT/MULTIPLE_TEXT):
    GPT nagyon rövid, tömör válaszokat ad szöveges kérdésekre. 
    Shortcut: Cmd/Ctrl+Shift+S
```

## 🔧 Technikai Működés

### GPT Prompt Módosítás

Amikor a rövid válasz mód **AKTÍV**, a GPT-nek küldött prompthoz hozzáadódik:

```
⚠️ IMPORTANT: Keep your answer(s) EXTREMELY SHORT and CONCISE. 
Use minimal words, abbreviations where possible, no explanations. 
Maximum 3-5 words per answer.
```

### Érintett Kérdéstípusok

✅ **TEXT** - Egyszerű szöveges válasz
✅ **MULTIPLE_TEXT** - Több szöveges válasz mező

❌ **RADIO** - Nem érintett (választás index-ekkel)
❌ **CHECKBOX** - Nem érintett (választás index-ekkel)  
❌ **SELECT** - Nem érintett (választás index-ekkel)

### Példa Válaszok

**Kérdés:** "Mi a HTTP teljes neve?"

| Normál Mód | Rövid Válasz Mód |
|------------|------------------|
| "The HTTP stands for HyperText Transfer Protocol, which is the foundation of data communication on the World Wide Web." | "HyperText Transfer Protocol" |

**Kérdés:** "Add meg a CPU 3 fő részét" (MULTIPLE_TEXT, 3 mező)

| Normál Mód | Rövid Válasz Mód |
|------------|------------------|
| Field 1: "Arithmetic Logic Unit (ALU) - performs mathematical operations"<br>Field 2: "Control Unit (CU) - manages operations"<br>Field 3: "Registers - temporary storage" | Field 1: "ALU"<br>Field 2: "Control Unit"<br>Field 3: "Registers" |

## 💾 Persistence

A beállítás **automatikusan mentődik** a localStorage/GM_storage-ba, így:
- Böngésző újraindítás után is megmarad
- Oldal újratöltés után is megmarad
- Tab-ok között szinkronizálódik (ugyanaz a config store)

## 🎨 CSS Animációk

### Indicator Animáció
```css
@keyframes pulse-indicator {
  0%, 100% { opacity: 0.9; }
  50% { opacity: 1; transform: scale(1.05); }
}
```
Az indicator "lüktet" 2 másodpercenként.

### Toast Slide-In/Out
```css
@keyframes slideInRight {
  from { transform: translateX(400px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
```

## 🔑 Shortcut Referencia

| Billentyű Kombináció | Funkció | Platform |
|---------------------|---------|----------|
| **Cmd + Shift + S** | Toggle rövid válasz mód | Mac |
| **Ctrl + Shift + S** | Toggle rövid válasz mód | Windows/Linux |
| **Cmd + Shift + H** | Config panel megnyitása | Mac |
| **Ctrl + Shift + H** | Config panel megnyitása | Windows/Linux |

A shortcut automatikusan felismeri a platformot (metaKey Mac-en, ctrlKey máshol).

## 🐛 Troubleshooting

### Indicator nem jelenik meg
1. Ellenőrizd hogy a rövid válasz mód be van-e kapcsolva (Alt+S)
2. Nézd meg a console-t (F12) hogy nincs-e JS hiba
3. Próbáld meg újratölteni az oldalt (Ctrl+R)

### Shortcut nem működik
1. Ellenőrizd hogy nincs-e input mezőben a kurzor (kilépés: Esc)
2. Mac-en: Cmd+Shift+S, Windows/Linux-on: Ctrl+Shift+S
3. Próbáld meg Config Panel-ből (checkbox)
4. Ellenőrizd hogy más extension nem használja-e ugyanazt a shortcut-ot

### Toast nem tűnik el
- Ez nem hiba, 2 másodperc után automatikusan el kell tűnnie
- Ha megmarad, ellenőrizd a console-t

### GPT mégsem ad rövid választ
1. Ellenőrizd hogy TEXT vagy MULTIPLE_TEXT típusú kérdésről van-e szó
2. Nézd meg a console-ban a "Full Prompt Sent to GPT" log-ot
3. Ellenőrizd hogy tartalmazza-e: "Keep your answer(s) EXTREMELY SHORT"
4. Néhány model (pl. o1-mini) ignolhatja az utasítást

## 📋 Changelog

### v1.0.0 (2025-10-29)
- ✨ Rövid válasz mód implementálva
- ⌨️ Alt+S shortcut hozzáadva
- 🎨 Vizuális indicator és toast notification
- 💾 Automatikus mentés configStore-ba
- 📝 GPT prompt módosítás TEXT/MULTIPLE_TEXT esetén

## 🔮 Jövőbeli Fejlesztések

- [ ] Testre szabható max szóhossz (jelenleg fix 3-5 szó)
- [ ] Külön rövid mód más kérdéstípusokhoz
- [ ] Indicator pozíció testreszabása
- [ ] Toast színek testreszabása
- [ ] Keyboard shortcut testreszabása
