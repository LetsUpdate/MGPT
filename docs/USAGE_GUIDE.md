# MGPT Responses API - Complete Usage Guide

## 🎉 What's New

MGPT now has **full Responses API integration** with:
- ✅ **Automatic quiz solving** with uploaded files
- ✅ **Document management** UI
- ✅ **Comprehensive logging** system
- ✅ **Thinking models** support
- ✅ **Context verification**

## 🚀 Quick Start (5 Minutes)

### Step 1: Open Config Panel
Press `Ctrl+Shift+H` (or `Cmd+Shift+H` on Mac)

### Step 2: Upload Your Study Materials
1. Click "Choose File" under "📁 Fájl Feltöltés"
2. Select a PDF or TXT file (lecture notes, textbook chapter, etc.)
3. Click green "Feltöltés" button
4. Repeat for all your study materials

### Step 3: Create Assistant
1. Click green "Asszisztens Létrehozása" button
2. Wait for confirmation
3. Assistant is now ready with all your files!

### Step 4: Enable Responses API
1. Check the "✨ Használd a Responses API-t" checkbox
2. Enable "🐛 Debug Naplózás" (recommended for first time)
3. Click "Save Settings"

### Step 5: Try It!
1. Go to a Moodle quiz
2. Click on a question
3. Watch MGPT answer using your uploaded materials
4. Click "📜 Naplók Megtekintése" to see what happened

## 📋 Detailed Guide

### File Upload

**Supported Formats:**
- PDF (lecture notes, textbook chapters, previous exams)
- TXT (study guides, notes)
- DOC/DOCX (documents)

**Best Practices:**
- Upload relevant course materials
- Name files clearly (e.g., "Chapter_3_Physics.pdf")
- Don't upload huge files (keep under 20MB each)
- Upload 3-5 key documents per course

**What Happens:**
1. File is read in browser
2. Converted to base64
3. Uploaded to OpenAI
4. Saved to your config
5. Available for assistant to search

### Assistant Creation

**What is an Assistant?**
An assistant is an AI that has access to your uploaded files and can search through them to answer questions.

**Creating an Assistant:**
1. Upload at least one file first
2. Click "Asszisztens Létrehozása"
3. Assistant is created with all uploaded files
4. You can create a new assistant anytime (replaces old one)

**Assistant Instructions:**
The assistant is instructed to:
- Use uploaded materials to answer questions
- Provide accurate academic answers
- Search through documents for relevant information
- Give reasoning based on course materials

### Document Management

**View Uploaded Files:**
- See list under "📁 Fájl Feltöltés"
- Shows filename and file ID
- Updated in real-time

**Delete Files:**
1. Click red "X" button next to file
2. Confirm deletion
3. File removed from list
4. Need to recreate assistant if you want to update files

**File Limits:**
- OpenAI allows up to 20 files per assistant
- Each file max 512MB (but keep smaller for speed)
- Total storage depends on your OpenAI plan

### Using Responses API

**When Enabled:**
- All quiz questions use the assistant
- Uploaded files provide context
- Thinking process logged
- Slower but more accurate

**When Disabled:**
- Standard ChatGPT API used
- No file context
- Faster
- Still accurate for general questions

**Best Use Cases:**
- ✅ Course-specific quizzes
- ✅ Questions from uploaded materials
- ✅ When you need reasoning
- ✅ Complex academic problems
- ❌ General knowledge (use standard API)
- ❌ When you don't have relevant materials

### Debug Logging

**What Gets Logged:**
- File uploads and deletions
- Assistant creation
- API requests and responses
- Context verification
- Thinking process
- Question processing
- Errors and warnings

**Log Levels:**
- **DEBUG** - Detailed technical info
- **INFO** - Important events
- **WARN** - Warnings
- **ERROR** - Errors

**Using the Log Viewer:**
1. Click "📜 Naplók Megtekintése"
2. Filter by level (DEBUG, INFO, WARN, ERROR)
3. See real-time updates
4. Export logs for analysis
5. Clear logs when needed

**What to Look For:**
```
✅ [INFO] [CONTEXT] Context verification - hasContext: true
✅ [INFO] [RESPONSES_API] Response received
✅ [DEBUG] [RESPONSES_API] Thinking process: ...
❌ [ERROR] [RESPONSES_API] Request failed
```

### Context Verification

**How to Verify Files Are Being Used:**

1. Enable debug logging
2. Ask a question
3. Open log viewer
4. Look for:
   - `[CONTEXT] Context verification` with `hasContext: true`
   - `fileCount: N` showing your files
   - `assistantId` being used
   - Thinking process mentioning your materials

**Example Log Entry:**
```
[2024-01-28T18:00:00.000Z] [INFO] [CONTEXT] Context verification
{
  "hasContext": true,
  "fileCount": 3,
  "assistantId": "asst_abc123...",
  "status": "Using file context"
}
```

### Thinking Process

**What is Thinking?**
Thinking models (o1, o1-mini, o3) show their reasoning process:
- Step-by-step analysis
- How they arrived at the answer
- What information they used
- Verification steps

**Viewing Thinking:**
1. Enable debug logging
2. Ask a question
3. Open log viewer
4. Look for `[DEBUG] [RESPONSES_API] Thinking process`
5. See detailed reasoning

**Benefits:**
- Understand how answer was derived
- Verify correct reasoning
- Learn from the process
- Catch errors in logic

## 🎯 Model Selection

See [MODEL_RECOMMENDATIONS.md](MODEL_RECOMMENDATIONS.md) for detailed guide.

**Quick Recommendations:**
- **o1-mini** - Start here (fast, cost-effective)
- **o1** - Complex problems (better reasoning)
- **o3** - Most challenging questions (best accuracy)

## 🔍 Troubleshooting

For detailed file upload troubleshooting, see [FILE_UPLOAD_TROUBLESHOOTING.md](FILE_UPLOAD_TROUBLESHOOTING.md)

### Issue: Files uploaded but not being used

**Check:**
1. Is "Használd a Responses API-t" enabled?
2. Did you create an assistant after uploading files?
3. Open log viewer - see `Context verification`
4. Check `hasContext: true` and `fileCount > 0`

**Solution:**
- Recreate assistant with "Asszisztens Létrehozása"
- Enable Responses API checkbox
- Save settings

### Issue: Assistant creation fails

**Check:**
1. Did you upload at least one file?
2. Is your API key valid?
3. Check log viewer for error details

**Solution:**
- Verify files are uploaded (see list)
- Check API key in config
- Try uploading smaller files

### Issue: Responses API is slow

**This is normal:**
- Thinking models take 5-15 seconds
- File search adds overhead
- More files = slightly slower

**Options:**
- Use o1-mini for faster results
- Use standard API when files not needed
- Be patient for complex questions

### Issue: Logs show errors

**Common Errors:**
1. **API key invalid** - Check your OpenAI API key
2. **File too large** - Use smaller files
3. **Rate limit** - Wait a minute, try again
4. **Network error** - Check internet connection

**Solution:**
- Read error message in logs
- Export logs for detailed analysis
- Check OpenAI API status

## 📊 Best Practices

### For Best Results:

1. **Upload Relevant Materials**
   - Course-specific documents
   - Recent materials (current semester)
   - 3-5 key documents

2. **Choose Right Model**
   - o1-mini for most questions
   - o1 for complex problems
   - See MODEL_RECOMMENDATIONS.md

3. **Enable Debug Logging**
   - At least initially
   - Helps verify setup
   - Useful for troubleshooting

4. **Review Thinking Process**
   - Don't just copy answers
   - Understand reasoning
   - Learn from process

5. **Manage Files**
   - Delete outdated materials
   - Keep files organized
   - Recreate assistant when updating files

### For Best Performance:

1. **Use Standard API When:**
   - General knowledge questions
   - Don't have relevant materials
   - Need fast answers
   - Simple questions

2. **Use Responses API When:**
   - Course-specific questions
   - Have uploaded materials
   - Need reasoning
   - Complex problems

3. **Model Selection:**
   - Start with o1-mini
   - Upgrade to o1 if needed
   - Use o3 for hardest questions

## 🎓 Academic Integrity

**Remember:**
- MGPT is a learning tool
- Understand the answers, don't just copy
- Review thinking process
- Use for studying and understanding
- Follow your institution's academic integrity policies

## 📖 Additional Resources

- [RESPONSES_API.md](RESPONSES_API.md) - Technical details
- [MODEL_RECOMMENDATIONS.md](MODEL_RECOMMENDATIONS.md) - Model selection guide
- [HOWTO.md](HOWTO.md) - General MGPT usage

## 🆘 Getting Help

1. **Check Logs:**
   - Open log viewer
   - Look for errors
   - Export for analysis

2. **Verify Setup:**
   - Files uploaded?
   - Assistant created?
   - Responses API enabled?
   - Debug logging on?

3. **Common Issues:**
   - See Troubleshooting section above
   - Check MODEL_RECOMMENDATIONS.md
   - Review logs for specific errors

## ✨ Summary

You now have:
- ✅ Full document management
- ✅ Automatic quiz solving with file context
- ✅ Comprehensive logging system
- ✅ Thinking models support
- ✅ Context verification

**Next Steps:**
1. Upload your study materials
2. Create an assistant
3. Enable Responses API
4. Try a quiz question
5. Check logs to verify it works
6. Review MODEL_RECOMMENDATIONS.md
7. Optimize for your use case

**Enjoy better, more accurate quiz answers with MGPT! 🎉**
