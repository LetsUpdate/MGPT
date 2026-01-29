# Tampermonkey Compatibility Guide

## ✅ YES! This Works with Tampermonkey!

**MGPT is specifically built as a Tampermonkey userscript.** All features, including the file upload functionality, are designed to work with Tampermonkey.

---

## 🎯 What is This?

MGPT is a **Tampermonkey userscript** - a JavaScript program that runs in your browser via the Tampermonkey extension.

### Built Specifically for Tampermonkey

- ✅ **Proper userscript format** (`.user.js` file)
- ✅ **Tampermonkey headers** (@name, @namespace, @grant, etc.)
- ✅ **GM_* APIs** (GM_xmlhttpRequest, GM_getValue, GM_setValue)
- ✅ **Auto-updates** from GitHub releases
- ✅ **File upload** using GM_xmlhttpRequest
- ✅ **All features tested** with Tampermonkey

---

## 📦 Installation Requirements

### 1. Install Tampermonkey

**Required:** You must have Tampermonkey installed in your browser.

**Download Tampermonkey:**
- Chrome: [Chrome Web Store](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
- Firefox: [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)
- Edge: [Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)
- Safari: [App Store](https://apps.apple.com/us/app/tampermonkey/id1482490089)
- Opera: [Opera Add-ons](https://addons.opera.com/en/extensions/details/tampermonkey-beta/)

### 2. Install MGPT Userscript

**Easy Installation:**
1. Click this link: [Install MGPT](https://github.com/LetsUpdate/MGPT/releases/latest/download/MGPT.user.js)
2. Tampermonkey will open automatically
3. Click "Install" button
4. Done! ✅

**Manual Installation:**
1. Download `MGPT.user.js` from [releases](https://github.com/LetsUpdate/MGPT/releases/latest)
2. Open Tampermonkey dashboard
3. Click "+" (Create new script)
4. Paste the content of `MGPT.user.js`
5. Click Save (Ctrl+S)

---

## 🔧 Tampermonkey-Specific Features

### GM_xmlhttpRequest

**What it is:** Tampermonkey's API for making HTTP requests across domains.

**Why we use it:**
- Makes requests to OpenAI API (api.openai.com)
- Bypasses browser CORS restrictions
- Required for file upload functionality

**File Upload Fix:**
The recent file upload fix specifically addresses GM_xmlhttpRequest compatibility:
```javascript
// Manual multipart/form-data construction
// Because GM_xmlhttpRequest doesn't support FormData objects
const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substr(2);
// ... builds proper HTTP multipart body
GM_xmlhttpRequest({
    method: 'POST',
    headers: {
        'Content-Type': 'multipart/form-data; boundary=' + boundary
    },
    data: body,
    binary: true  // Tampermonkey-specific flag
});
```

### GM_getValue / GM_setValue

**What it is:** Tampermonkey's persistent storage API.

**What we store:**
- OpenAI API key (encrypted in browser)
- Assistant ID and Thread ID
- Uploaded files metadata
- User preferences
- Debug logging settings

### Other GM_* APIs Used

- `GM_setClipboard` - Copy answers to clipboard
- `GM_openInTab` - Open links in new tabs
- `GM_info` - Get script version info
- `unsafeWindow` - Access page's window object

---

## ✅ Verification: Is It Working?

### Check Installation

1. **Open Tampermonkey Dashboard**
   - Click Tampermonkey icon in browser toolbar
   - Select "Dashboard"

2. **Find MGPT**
   - Look for "Moodle GPT" in the list
   - Should show version (e.g., 1.0.0)
   - Status should be "Enabled" (green toggle)

3. **Check Granted Permissions**
   - Click on script name
   - Go to "Settings" tab
   - Verify these are granted:
     - ✅ GM_xmlhttpRequest
     - ✅ GM_getValue
     - ✅ GM_setValue
     - ✅ GM_setClipboard
     - ✅ unsafeWindow

### Test File Upload (with Tampermonkey)

1. **Navigate to Moodle site**
   - Open any site listed in @include (e.g., elearning.uni-obuda.hu)

2. **Open Config Panel**
   - Press `Ctrl+Shift+H` (Mac: `Cmd+Shift+H`)
   - Panel should open ✅

3. **Configure API Key**
   - Enter your OpenAI API key
   - Click "Save Settings"
   - Key is stored via GM_setValue ✅

4. **Upload a File**
   - Choose a PDF or TXT file
   - Click "Feltöltés" (Upload)
   - File uploads via GM_xmlhttpRequest ✅
   - Check uploaded files list

5. **Verify in Console**
   - Press F12 (Developer Tools)
   - Go to Console tab
   - Look for: `[INFO] [FILE_MGMT] UPLOAD_SUCCESS`

---

## 🐛 Troubleshooting Tampermonkey Issues

### Issue: Script Not Running

**Symptoms:** Config panel doesn't open, nothing happens on Moodle sites.

**Solutions:**
1. Check Tampermonkey is enabled (icon in toolbar)
2. Check MGPT is enabled in dashboard
3. Verify you're on a supported site (@include list)
4. Try refreshing the page (Ctrl+F5)

### Issue: GM_xmlhttpRequest Not Working

**Symptoms:** File upload fails, API requests fail.

**Solutions:**
1. **Check @grant permissions:**
   - Open Tampermonkey dashboard
   - Edit MGPT script
   - Verify line: `// @grant GM_xmlhttpRequest`

2. **Check @connect permissions:**
   - Verify line: `// @connect api.openai.com`
   - Verify line: `// @connect *`

3. **Tampermonkey settings:**
   - Open Tampermonkey dashboard
   - Go to Settings (gear icon)
   - Ensure "Config mode" is NOT "Novice"

### Issue: Storage Not Persisting

**Symptoms:** API key disappears, settings not saved.

**Solutions:**
1. Check GM_setValue/GM_getValue are granted
2. Check browser's storage quota
3. Try different storage type in Tampermonkey settings

### Issue: CORS Errors

**Symptoms:** Console shows CORS errors when calling APIs.

**This shouldn't happen with Tampermonkey!**

GM_xmlhttpRequest bypasses CORS restrictions.

**If you see CORS errors:**
1. You might not be using GM_xmlhttpRequest
2. Check the script is using the right API
3. Verify Tampermonkey is working (not regular XMLHttpRequest)

---

## 📱 Browser Compatibility

### Fully Supported ✅

- **Chrome/Chromium** - Full support
- **Firefox** - Full support  
- **Microsoft Edge** - Full support
- **Opera** - Full support

### Limited Support ⚠️

- **Safari** - Requires Tampermonkey from App Store
  - Some features may be restricted by iOS/macOS
  - Test file upload specifically

### Not Supported ❌

- **Mobile Browsers** - Tampermonkey not available on most mobile browsers
  - Exception: Kiwi Browser (Android) with Chrome extensions

---

## 🔐 Security & Privacy

### What Tampermonkey Allows

MGPT uses Tampermonkey's security model:

1. **Sandboxed Execution**
   - Script runs in isolated environment
   - Cannot access other scripts' data

2. **Explicit Permissions**
   - All GM_* APIs require @grant declarations
   - User sees permissions before installing

3. **Cross-Domain Requests**
   - Only to whitelisted domains (@connect)
   - api.openai.com explicitly allowed

4. **Local Storage**
   - API key stored locally in browser
   - Never sent to third parties
   - Encrypted by browser's storage

### What We Access

- **Moodle Pages** - Read quiz questions, inject UI
- **OpenAI API** - Send questions, receive answers
- **Local Storage** - Store settings, file metadata
- **Clipboard** - Copy answers (with GM_setClipboard)

### What We Don't Access

- ❌ Your personal files (except uploaded via UI)
- ❌ Other websites (only @include sites)
- ❌ Browser history
- ❌ Passwords or credentials
- ❌ Other extensions' data

---

## 🚀 Advanced: Development with Tampermonkey

### Building from Source

If you're developing MGPT:

```bash
# Install dependencies
npm install

# Build development version
npm run build:dev

# Output: dist/MGPT.user.js
```

### Testing in Tampermonkey

1. **Build the script**
   ```bash
   npm run build:dev
   ```

2. **Install in Tampermonkey**
   - Open Tampermonkey dashboard
   - Create new script or edit existing
   - Paste content from `dist/MGPT.user.js`

3. **Enable development mode**
   - In Tampermonkey settings
   - Set "Config mode" to "Advanced"
   - Enable console logging

4. **Watch for changes**
   ```bash
   npm run watch
   ```
   - Auto-rebuilds on file changes
   - Manually refresh in Tampermonkey

### Debugging

**Console Logs:**
```javascript
console.log('[MGPT]', 'Debug message');
```

**Access GM_* in console:**
Tampermonkey exposes GM_* APIs to userscripts, but NOT to the browser console directly.

**Workaround:**
```javascript
// Add to your code for debugging
unsafeWindow.DEBUG_uploadFile = MGPT_uploadFile;
```

Then in console:
```javascript
DEBUG_uploadFile({filename: 'test.txt', content: 'Hello'});
```

---

## 📊 Technical Specifications

### Userscript Metadata

```javascript
// ==UserScript==
// @name Moodle GPT
// @version 1.0.0
// @description AI-powered learning assistant for Moodle
// @author RED
// @namespace https://github.com/LetsUpdate/MGPT

// Required APIs
// @grant GM_xmlhttpRequest    ← File uploads, API calls
// @grant GM_getValue           ← Read stored settings
// @grant GM_setValue           ← Save settings
// @grant GM_deleteValue        ← Clear settings
// @grant GM_setClipboard       ← Copy answers
// @grant GM_openInTab          ← Open links
// @grant GM_info              ← Script info
// @grant unsafeWindow          ← Page access

// Network permissions
// @connect api.openai.com      ← OpenAI API
// @connect localhost           ← Local development
// @connect *                   ← Fallback (Tampermonkey only)

// Auto-update
// @updateURL https://github.com/LetsUpdate/MGPT/releases/latest/download/MGPT.meta.js
// @downloadURL https://github.com/LetsUpdate/MGPT/releases/latest/download/MGPT.user.js
// ==/UserScript==
```

### Build Configuration

**Webpack + webpack-userscript plugin:**
- Bundles all source files
- Adds userscript headers automatically
- Creates `.user.js` and `.meta.js` files
- Minification for production builds

**Output:**
- Development: `MGPT.user.js` (~172 KiB, readable)
- Production: `MGPT.user.js` (~47 KiB, minified)

---

## ❓ FAQ

### Q: Do I need anything besides Tampermonkey?

**A:** No! Just Tampermonkey and the MGPT userscript. You'll also need an OpenAI API key to use the AI features.

### Q: Will this work with Greasemonkey?

**A:** Possibly, but **not tested**. MGPT is built for Tampermonkey specifically. Greasemonkey has different APIs and may not support all features.

### Q: Can I use this on mobile?

**A:** Limited. Kiwi Browser (Android) supports Chrome extensions including Tampermonkey. iOS Safari with Tampermonkey might work but is untested.

### Q: Does the file upload fix work with Tampermonkey?

**A:** YES! The file upload fix was specifically designed for Tampermonkey's GM_xmlhttpRequest API. It manually constructs multipart/form-data because GM_xmlhttpRequest doesn't support FormData objects.

### Q: Why not use regular fetch() or XMLHttpRequest?

**A:** Those would fail due to CORS (Cross-Origin Resource Sharing) restrictions when calling api.openai.com from a Moodle site. GM_xmlhttpRequest bypasses CORS, which is why we need Tampermonkey.

### Q: Is my API key safe?

**A:** Yes. Your API key is:
- Stored locally via GM_setValue (in browser only)
- Never sent to anyone except OpenAI
- Encrypted by browser's storage system
- Not accessible to other websites or scripts

### Q: Can I see the source code?

**A:** Absolutely! MGPT is open source: https://github.com/LetsUpdate/MGPT

The built userscript contains all source code (readable in dev builds, minified in production builds).

---

## 📚 Related Documentation

- [README.md](../README.md) - Project overview
- [USAGE_GUIDE.md](USAGE_GUIDE.md) - How to use MGPT
- [FILE_UPLOAD_TROUBLESHOOTING.md](FILE_UPLOAD_TROUBLESHOOTING.md) - File upload issues
- [RESPONSES_API.md](RESPONSES_API.md) - Responses API technical details
- [MODEL_RECOMMENDATIONS.md](MODEL_RECOMMENDATIONS.md) - Model selection guide

---

## 🎉 Conclusion

**Yes, MGPT works with Tampermonkey!**

In fact, it **requires** Tampermonkey to work at all. The entire project is built as a Tampermonkey userscript, and all features (including the file upload) are specifically designed for Tampermonkey's APIs.

**To get started:**
1. Install Tampermonkey
2. Install MGPT userscript
3. Open Moodle site
4. Press Ctrl+Shift+H
5. Add your OpenAI API key
6. Start using! 🚀

**Still have questions?**
- Open an issue: https://github.com/LetsUpdate/MGPT/issues
- Check existing issues for solutions
- Read the documentation files linked above
