# File Upload Troubleshooting

## Common File Upload Errors

### Error: "'file' is a required property" (HTTP 400)

**Error Message:**
```
Hiba a fájl feltöltése során: HTTP 400: {
"error": {
"message": "'file' is a required property",
"type": "invalid_request_error",
"param": null,
"code": null
}
```

**Cause:**
This error occurred in earlier versions where the file upload implementation used JavaScript `FormData` objects, which are not properly supported by `GM_xmlhttpRequest` in Tampermonkey userscripts.

**Status:** ✅ **FIXED**

**Fix Applied:**
The file upload now manually constructs the `multipart/form-data` request body, ensuring proper compatibility with `GM_xmlhttpRequest`.

**If You Still See This Error:**
1. Make sure you're using the latest version
2. Rebuild the userscript: `npm run build:dev`
3. Reinstall the userscript in Tampermonkey
4. Clear browser cache
5. Try uploading again

---

### Error: "File content cannot be empty"

**Cause:**
The file wasn't properly read before upload.

**Solution:**
1. Make sure the file is not empty
2. Check that the file is a supported format (PDF, TXT, DOC, DOCX)
3. Try with a smaller file first (under 5MB)

---

### Error: "Invalid data URL format"

**Cause:**
The file content is not in the expected base64 data URL format.

**Solution:**
This is an internal error. The file should be automatically converted to the correct format by the FileReader API.

**If you see this:**
1. Try a different file
2. Check browser console for more details
3. Make sure you're using a modern browser

---

### Error: "API key not configured"

**Cause:**
No OpenAI API key is set in the configuration.

**Solution:**
1. Press `Ctrl+Shift+H` to open config panel
2. Enter your OpenAI API key
3. Click "Save Settings"
4. Try uploading again

---

### Error: HTTP 401 - Unauthorized

**Cause:**
Invalid or expired OpenAI API key.

**Solution:**
1. Go to https://platform.openai.com/api-keys
2. Generate a new API key
3. Update the key in MGPT config panel
4. Save settings and try again

---

### Error: HTTP 413 - Request Entity Too Large

**Cause:**
File is too large for upload.

**Solution:**
OpenAI's file upload limits:
- Maximum file size: 512MB
- Recommended: Keep files under 20MB for better performance

**What to do:**
1. Compress or split large PDF files
2. Extract only relevant sections
3. Use text files instead of PDFs when possible

---

### File Upload Success But Not Being Used

**Symptoms:**
- File uploads successfully
- File appears in uploaded files list
- But answers don't use the file content

**Solution:**
1. After uploading files, click "Asszisztens Létrehozása"
2. Enable "✨ Használd a Responses API-t" checkbox
3. Save settings
4. Enable "🐛 Debug Naplózás"
5. Click "📜 Naplók Megtekintése"
6. Look for `[CONTEXT] Context verification` showing `hasContext: true`

---

## Best Practices

### Before Uploading:

1. **Check file size**: Keep under 20MB for best performance
2. **Use clear filenames**: E.g., "Chapter_3_Physics.pdf"
3. **Organize content**: Upload only relevant materials
4. **Test with small files first**: Verify setup works

### After Uploading:

1. **Verify in list**: Check uploaded files list shows your file
2. **Create assistant**: Click "Asszisztens Létrehozása"
3. **Enable Responses API**: Check the toggle
4. **Enable logging**: Turn on debug logging
5. **Test with question**: Try a quiz question
6. **Check logs**: Verify context is being used

### Troubleshooting Workflow:

```
1. Upload File
   ├─ Success? ─→ Go to step 2
   └─ Error? ─→ Check error message above
   
2. Create Assistant
   ├─ Success? ─→ Go to step 3
   └─ Error? ─→ Check API key, file list
   
3. Enable Responses API
   └─→ Save settings
   
4. Test Question
   ├─ Answer uses context? ─→ ✅ Success!
   └─ Generic answer? ─→ Check logs
   
5. Check Logs
   ├─ hasContext: true? ─→ Working correctly
   └─ hasContext: false? ─→ Recreate assistant
```

---

## Debug Logging

To see detailed information about file uploads:

1. Open config panel: `Ctrl+Shift+H`
2. Enable "🐛 Debug Naplózás"
3. Upload a file
4. Click "📜 Naplók Megtekintése"

**Look for these log entries:**

```
✅ [INFO] [FILE_MGMT] UPLOAD_SUCCESS: filename.pdf
   { id: "file-abc123...", size: 245678 }

✅ [INFO] [ASSISTANT] CREATE_SUCCESS: asst_xyz789...
   { fileCount: 2 }

✅ [INFO] [CONTEXT] Context verification
   { hasContext: true, fileCount: 2 }
```

**If you see errors:**

```
❌ [ERROR] [FILE_MGMT] File upload failed
   → Check error details in log data
```

---

## Still Having Issues?

If file uploads still fail:

1. **Check OpenAI Status**: https://status.openai.com/
2. **Verify API Key**: https://platform.openai.com/api-keys
3. **Check Rate Limits**: You might be hitting API rate limits
4. **Try Different File**: Test with a simple text file
5. **Export Logs**: Use log viewer to export JSON for analysis
6. **Check Browser Console**: Look for JavaScript errors

---

## Technical Details

### How File Upload Works:

1. **File Selection**: User selects file via HTML input
2. **FileReader**: Browser reads file as base64 data URL
3. **Manual Multipart**: Construct multipart/form-data manually
4. **GM_xmlhttpRequest**: Send to OpenAI Files API
5. **Store Metadata**: Save file info to config
6. **Update UI**: Show file in uploaded files list

### Why Manual Multipart?

Tampermonkey's `GM_xmlhttpRequest` doesn't support JavaScript `FormData` objects. We manually construct the HTTP multipart/form-data body following RFC 2388 specification.

### Request Format:

```
POST /v1/files HTTP/1.1
Host: api.openai.com
Authorization: Bearer sk-...
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...

------WebKitFormBoundary...
Content-Disposition: form-data; name="file"; filename="notes.pdf"
Content-Type: application/pdf

[binary file data]
------WebKitFormBoundary...
Content-Disposition: form-data; name="purpose"

assistants
------WebKitFormBoundary...--
```

---

## Related Documentation

- [USAGE_GUIDE.md](USAGE_GUIDE.md) - Complete usage guide
- [MODEL_RECOMMENDATIONS.md](MODEL_RECOMMENDATIONS.md) - Model selection
- [RESPONSES_API.md](RESPONSES_API.md) - Technical API details
