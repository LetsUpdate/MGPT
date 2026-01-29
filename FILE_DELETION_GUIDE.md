# File Deletion Guide - RAG Files Management

## Overview

This guide explains how to delete uploaded RAG files from your MGPT installation. Files can be deleted both via the UI and via console commands.

## Quick Answer

**Yes! RAG files are fully deletable in two ways:**
1. ✅ **Via UI** - Click the X button in the config panel
2. ✅ **Via Console** - Use `MGPT_deleteFile(fileId)` function

---

## Method 1: Delete via UI (Easiest) ⭐

### Steps:

1. **Open Config Panel**
   - Press `Ctrl+Shift+H` (Windows/Linux)
   - Press `Cmd+Shift+H` (Mac)

2. **Find File Section**
   - Scroll to "Feltöltött Fájlok" (Uploaded Files)
   - You'll see a list of all uploaded files

3. **Delete File**
   - Click the red **X** button next to the file you want to delete
   - Confirm deletion in the dialog that appears
   - File is deleted immediately

### Visual Example:

```
Feltöltött Fájlok (2):
┌──────────────────────────────────────────┐
│ ✓ lecture-03.pdf                    [X] │
│ ✓ notes.txt                         [X] │
└──────────────────────────────────────────┘
```

Click the `[X]` button → Confirm → File deleted!

---

## Method 2: Delete via Console

### Available Console Functions

Open browser console (F12) to use these commands:

#### 1. List All Files

```javascript
MGPT_listFiles()
```

**Output:**
```
📁 Uploaded files: 2
   1. lecture-03.pdf (ID: file-abc123)
      Uploaded: 2026-01-29T18:00:00.000Z
      Size: 524288 bytes
   2. notes.txt (ID: file-def456)
      Uploaded: 2026-01-29T18:05:00.000Z
      Size: 2048 bytes
```

**Returns:** Array of file objects

#### 2. Get File Information

```javascript
MGPT_getFileInfo('file-abc123')
```

**Output:**
```
📄 File info:
   Filename: lecture-03.pdf
   ID: file-abc123
   Uploaded: 2026-01-29T18:00:00.000Z
   Size: 524288 bytes
   Purpose: assistants
```

**Returns:** File object or null if not found

#### 3. Delete a File ⭐

```javascript
MGPT_deleteFile('file-abc123')
```

**Output:**
```
🗑️ Deleting file: lecture-03.pdf (file-abc123)...
✅ File deleted successfully: lecture-03.pdf
   Remaining files: 1
```

**Returns:** Promise<boolean> (true on success)

---

## Common Usage Scenarios

### Scenario 1: Delete a Specific File

```javascript
// Step 1: List files to find the one you want
const files = MGPT_listFiles();

// Step 2: Copy the file ID from console output
// Look for: file-abc123

// Step 3: Delete the file
await MGPT_deleteFile('file-abc123');
```

### Scenario 2: Delete Files by Name

```javascript
// Step 1: List all files
const files = MGPT_listFiles();

// Step 2: Find file by name
const oldFile = files.find(f => f.filename === 'old-notes.pdf');

// Step 3: Delete if found
if (oldFile) {
    await MGPT_deleteFile(oldFile.id);
}
```

### Scenario 3: Delete All Files

```javascript
// Get all uploaded files
const files = MGPT_listFiles();

// Delete each one (with confirmation)
for (const file of files) {
    console.log(`Deleting: ${file.filename}`);
    await MGPT_deleteFile(file.id);
}

console.log('All files deleted!');
```

### Scenario 4: Delete Old Files (Older than 7 days)

```javascript
const files = MGPT_listFiles();
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

for (const file of files) {
    const uploadDate = new Date(file.uploadedAt);
    if (uploadDate < sevenDaysAgo) {
        console.log(`Deleting old file: ${file.filename}`);
        await MGPT_deleteFile(file.id);
    }
}
```

### Scenario 5: Safe Deletion with Verification

```javascript
// Function to safely delete a file
async function safeDeleteFile(fileId) {
    // Check if file exists
    const file = MGPT_getFileInfo(fileId);
    
    if (!file) {
        console.error(`File not found: ${fileId}`);
        return false;
    }
    
    // Show file info
    console.log(`About to delete: ${file.filename} (${file.size} bytes)`);
    
    // Confirm (in real usage, you'd use a prompt)
    const confirmed = true; // Replace with: confirm(`Delete ${file.filename}?`)
    
    if (confirmed) {
        await MGPT_deleteFile(fileId);
        return true;
    } else {
        console.log('Deletion cancelled');
        return false;
    }
}

// Usage
await safeDeleteFile('file-abc123');
```

---

## What Happens When You Delete a File?

### Deletion Process:

1. **API Request Sent**
   - DELETE request to OpenAI: `/v1/files/{fileId}`
   - File is permanently deleted from OpenAI servers

2. **Local Config Updated**
   - File removed from `uploadedFiles` array
   - Configuration saved to browser storage

3. **UI Updates**
   - File list refreshes automatically (if config panel open)
   - File count updates
   - File no longer visible

4. **Confirmation Shown**
   - Success message in console
   - Remaining file count displayed

### Important Notes:

⚠️ **Deletion is permanent!**
- Files cannot be recovered after deletion
- You'll need to re-upload if you delete by mistake

⚠️ **Assistants using deleted files:**
- If an assistant uses a deleted file, it may error
- Recreate the assistant with new files if needed

✅ **Safe to delete:**
- Files you no longer need
- Old versions of documents
- Test files
- Duplicate uploads

---

## Error Handling

### Common Errors and Solutions

#### Error: "File not found"

**Cause:** File ID doesn't exist in local storage

**Solution:**
```javascript
// List files first to get correct IDs
const files = MGPT_listFiles();
```

#### Error: "API key not configured"

**Cause:** No OpenAI API key set

**Solution:**
1. Open config panel (Ctrl+Shift+H)
2. Enter your API key
3. Save settings
4. Try deletion again

#### Error: "Failed to delete file from OpenAI"

**Cause:** Network error or file already deleted on OpenAI

**Solution:**
```javascript
// Remove from local config manually
const config = configStore.getConfig();
const uploadedFiles = config.uploadedFiles.filter(f => f.id !== 'file-abc123');
configStore.update({ uploadedFiles });
```

#### Error: "Permission denied"

**Cause:** API key doesn't have permission to delete files

**Solution:**
- Check your API key permissions in OpenAI dashboard
- Ensure key has "write" permissions

---

## Bulk Operations

### Delete Multiple Files at Once

```javascript
// Delete multiple specific files
const filesToDelete = ['file-abc123', 'file-def456', 'file-ghi789'];

for (const fileId of filesToDelete) {
    try {
        await MGPT_deleteFile(fileId);
        console.log(`✅ Deleted: ${fileId}`);
    } catch (error) {
        console.error(`❌ Failed to delete ${fileId}:`, error.message);
    }
}
```

### Delete Files Matching Pattern

```javascript
// Delete all PDF files
const files = MGPT_listFiles();
const pdfFiles = files.filter(f => f.filename.endsWith('.pdf'));

for (const file of pdfFiles) {
    await MGPT_deleteFile(file.id);
}
```

### Delete Files Larger Than X Bytes

```javascript
// Delete files larger than 1MB
const files = MGPT_listFiles();
const largeFiles = files.filter(f => f.size > 1024 * 1024);

for (const file of largeFiles) {
    console.log(`Deleting large file: ${file.filename} (${file.size} bytes)`);
    await MGPT_deleteFile(file.id);
}
```

---

## Best Practices

### ✅ DO:

1. **List files before deleting**
   ```javascript
   MGPT_listFiles(); // See what you have first
   ```

2. **Check file info before deletion**
   ```javascript
   MGPT_getFileInfo('file-abc123'); // Verify it's the right file
   ```

3. **Delete old/unused files regularly**
   - Saves storage space
   - Keeps file list clean
   - Reduces OpenAI storage costs

4. **Keep important files backed up**
   - Download important files before deletion
   - Keep copies of source documents

### ❌ DON'T:

1. **Don't delete without checking**
   - Always verify file ID first
   - Check filename before deletion

2. **Don't delete files in use**
   - Check if assistant is using the file
   - Create new assistant if needed

3. **Don't delete and immediately recreate assistant**
   - Wait a moment after deletion
   - Files need time to clear from OpenAI

---

## Troubleshooting

### Problem: "Deleted file still shows in UI"

**Solution:**
```javascript
// Refresh the page or close/reopen config panel
location.reload();
```

### Problem: "Can't delete file - button doesn't work"

**Solution:**
1. Try console method instead:
   ```javascript
   MGPT_deleteFile('file-abc123')
   ```
2. Check browser console for errors (F12)

### Problem: "Deleted file but assistant still references it"

**Solution:**
```javascript
// Recreate assistant without the deleted file
const files = MGPT_listFiles();
const fileIds = files.map(f => f.id);

await MGPT_createAssistant({
    name: 'Updated Assistant',
    instructions: 'Your instructions here',
    fileIds: fileIds
});
```

### Problem: "How do I undo a deletion?"

**Answer:** 
- **You can't** - deletions are permanent
- You'll need to re-upload the file
- Keep backups of important files

---

## Complete API Reference

### MGPT_listFiles()

**Purpose:** List all uploaded files

**Parameters:** None

**Returns:** `Array<Object>` - List of file objects

**Example:**
```javascript
const files = MGPT_listFiles();
console.log(`Total files: ${files.length}`);
```

---

### MGPT_getFileInfo(fileId)

**Purpose:** Get detailed information about a specific file

**Parameters:**
- `fileId` (string, required) - File ID to get info for

**Returns:** `Object|null` - File information or null if not found

**Example:**
```javascript
const file = MGPT_getFileInfo('file-abc123');
if (file) {
    console.log(`Filename: ${file.filename}`);
    console.log(`Size: ${file.size} bytes`);
}
```

---

### MGPT_deleteFile(fileId)

**Purpose:** Delete an uploaded file permanently

**Parameters:**
- `fileId` (string, required) - File ID to delete

**Returns:** `Promise<boolean>` - True if deleted successfully

**Throws:** Error if deletion fails

**Example:**
```javascript
try {
    await MGPT_deleteFile('file-abc123');
    console.log('File deleted successfully');
} catch (error) {
    console.error('Deletion failed:', error.message);
}
```

---

## FAQ

### Q: Are deletions permanent?
**A:** Yes. Files are deleted from OpenAI and cannot be recovered.

### Q: Does deleting a file affect my assistant?
**A:** If the assistant uses that file, you may need to recreate the assistant.

### Q: How much does file storage cost?
**A:** OpenAI charges $0.10 per GB per day for file storage.

### Q: Can I delete files uploaded by others?
**A:** You can only delete files uploaded with your API key.

### Q: What happens if I delete a file mid-conversation?
**A:** The current conversation may error. Start a new conversation.

### Q: Can I bulk delete all files at once?
**A:** Yes, use the console method to loop through and delete all files.

### Q: Is there a limit to how many files I can delete?
**A:** No limit, but deletions are rate-limited by OpenAI's API.

### Q: Do deleted files still count toward my OpenAI quota?
**A:** No, deleted files no longer count toward storage or costs.

---

## Summary

### File Deletion Methods:

| Method | Ease of Use | Best For |
|--------|-------------|----------|
| UI Click | ⭐⭐⭐⭐⭐ Easy | Single file deletions |
| Console | ⭐⭐⭐ Moderate | Bulk operations, scripting |

### Key Points:

✅ **Two ways to delete:** UI and console
✅ **Deletions are permanent** - no undo
✅ **Safe and reliable** - removes from both OpenAI and local storage
✅ **User-friendly** - helpful messages and confirmations
✅ **Bulk operations** - delete multiple files via console

**RAG files are fully deletable and manageable!** 🗑️✨
