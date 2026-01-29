# Official Responses API Documentation Resources

**Complete list of official documentation and resources for OpenAI's Assistants/Responses API**

---

## 🎯 Quick Links

### Essential OpenAI Documentation

1. **Assistants API Overview** ⭐ START HERE
   - URL: https://platform.openai.com/docs/assistants/overview
   - What it covers: Introduction to Assistants API, core concepts, capabilities
   - Best for: Understanding what Assistants API is and how it works

2. **Assistants API Quickstart**
   - URL: https://platform.openai.com/docs/assistants/quickstart
   - What it covers: Step-by-step guide to create your first assistant
   - Best for: Getting started quickly with code examples

3. **Assistants API Reference** 📚
   - URL: https://platform.openai.com/docs/api-reference/assistants
   - What it covers: Complete API endpoints, parameters, responses
   - Best for: Technical implementation details

4. **File Search Tool**
   - URL: https://platform.openai.com/docs/assistants/tools/file-search
   - What it covers: How file search works, vector stores, citations
   - Best for: Understanding file upload and search capabilities

5. **Messages API Reference**
   - URL: https://platform.openai.com/docs/api-reference/messages
   - What it covers: Creating and managing messages in threads
   - Best for: Understanding conversation flow

6. **Threads API Reference**
   - URL: https://platform.openai.com/docs/api-reference/threads
   - What it covers: Thread creation and management
   - Best for: Understanding conversation persistence

7. **Runs API Reference**
   - URL: https://platform.openai.com/docs/api-reference/runs
   - What it covers: Running assistants on threads
   - Best for: Understanding execution flow

---

## 📖 Detailed Documentation Structure

### 1. Core Concepts

#### Assistants API Overview
**URL:** https://platform.openai.com/docs/assistants/overview

**Topics covered:**
- What is an Assistant
- Tools available (File Search, Code Interpreter, Function Calling)
- How Assistants differ from Chat Completions
- When to use Assistants vs Chat Completions
- Pricing and billing

**Key takeaways:**
- Assistants can use multiple tools
- Persistent threads maintain conversation context
- File Search enables document Q&A
- More complex but more powerful than Chat Completions

#### How Assistants Work
**URL:** https://platform.openai.com/docs/assistants/how-it-works

**Topics covered:**
- Assistant architecture
- Objects: Assistants, Threads, Messages, Runs
- Execution flow
- Status polling
- Streaming responses

**Key concepts:**
```
1. Create Assistant (with tools and files)
2. Create Thread (conversation)
3. Add Message to Thread
4. Run Assistant on Thread
5. Poll for completion
6. Retrieve Messages
```

---

### 2. Tools and Capabilities

#### File Search
**URL:** https://platform.openai.com/docs/assistants/tools/file-search

**Topics covered:**
- Uploading files to vector stores
- Supported file formats
- Maximum file sizes
- Chunking and indexing
- Citations and annotations
- Best practices

**Supported formats:**
- `.pdf`, `.txt`, `.md`, `.html`
- `.doc`, `.docx`
- `.json`, `.csv`
- Code files (`.py`, `.js`, `.java`, etc.)

**Limits:**
- Max file size: 512 MB per file
- Max files per vector store: 10,000 files
- Max vector stores: Based on account tier

#### Code Interpreter
**URL:** https://platform.openai.com/docs/assistants/tools/code-interpreter

**Topics covered:**
- Running Python code
- File uploads for code execution
- Generating charts and graphs
- Data analysis capabilities

**Use cases:**
- Data analysis
- Math calculations
- File processing
- Visualization generation

#### Function Calling
**URL:** https://platform.openai.com/docs/assistants/tools/function-calling

**Topics covered:**
- Defining custom functions
- Function schemas
- Handling function calls
- Returning results

**Use cases:**
- External API integration
- Database queries
- Custom business logic
- Real-time data fetching

---

### 3. API Reference

#### Assistants Endpoints
**URL:** https://platform.openai.com/docs/api-reference/assistants

**Endpoints:**

**Create Assistant:**
```http
POST https://api.openai.com/v1/assistants
```
**Parameters:**
- `model` (required): Model ID (e.g., "gpt-4o")
- `name` (optional): Assistant name
- `description` (optional): Description
- `instructions` (optional): System instructions
- `tools` (optional): Array of tools (file_search, code_interpreter, function)
- `metadata` (optional): Custom metadata

**List Assistants:**
```http
GET https://api.openai.com/v1/assistants
```

**Retrieve Assistant:**
```http
GET https://api.openai.com/v1/assistants/{assistant_id}
```

**Modify Assistant:**
```http
POST https://api.openai.com/v1/assistants/{assistant_id}
```

**Delete Assistant:**
```http
DELETE https://api.openai.com/v1/assistants/{assistant_id}
```

#### Threads Endpoints
**URL:** https://platform.openai.com/docs/api-reference/threads

**Create Thread:**
```http
POST https://api.openai.com/v1/threads
```

**Retrieve Thread:**
```http
GET https://api.openai.com/v1/threads/{thread_id}
```

**Modify Thread:**
```http
POST https://api.openai.com/v1/threads/{thread_id}
```

**Delete Thread:**
```http
DELETE https://api.openai.com/v1/threads/{thread_id}
```

#### Messages Endpoints
**URL:** https://platform.openai.com/docs/api-reference/messages

**Create Message:**
```http
POST https://api.openai.com/v1/threads/{thread_id}/messages
```
**Parameters:**
- `role` (required): "user" or "assistant"
- `content` (required): Message text
- `attachments` (optional): File attachments
- `metadata` (optional): Custom metadata

**List Messages:**
```http
GET https://api.openai.com/v1/threads/{thread_id}/messages
```

**Retrieve Message:**
```http
GET https://api.openai.com/v1/threads/{thread_id}/messages/{message_id}
```

#### Runs Endpoints
**URL:** https://platform.openai.com/docs/api-reference/runs

**Create Run:**
```http
POST https://api.openai.com/v1/threads/{thread_id}/runs
```
**Parameters:**
- `assistant_id` (required): ID of assistant to use
- `instructions` (optional): Override assistant instructions
- `additional_instructions` (optional): Append to instructions
- `model` (optional): Override assistant model
- `tools` (optional): Override assistant tools

**List Runs:**
```http
GET https://api.openai.com/v1/threads/{thread_id}/runs
```

**Retrieve Run:**
```http
GET https://api.openai.com/v1/threads/{thread_id}/runs/{run_id}
```

**Cancel Run:**
```http
POST https://api.openai.com/v1/threads/{thread_id}/runs/{run_id}/cancel
```

#### Vector Stores Endpoints
**URL:** https://platform.openai.com/docs/api-reference/vector-stores

**Create Vector Store:**
```http
POST https://api.openai.com/v1/vector_stores
```

**List Vector Stores:**
```http
GET https://api.openai.com/v1/vector_stores
```

**Attach Files to Vector Store:**
```http
POST https://api.openai.com/v1/vector_stores/{vector_store_id}/files
```

---

### 4. Files API
**URL:** https://platform.openai.com/docs/api-reference/files

**Upload File:**
```http
POST https://api.openai.com/v1/files
```
**Parameters:**
- `file` (required): File to upload
- `purpose` (required): "assistants" for Assistants API

**List Files:**
```http
GET https://api.openai.com/v1/files
```

**Retrieve File:**
```http
GET https://api.openai.com/v1/files/{file_id}
```

**Delete File:**
```http
DELETE https://api.openai.com/v1/files/{file_id}
```

**Download File Content:**
```http
GET https://api.openai.com/v1/files/{file_id}/content
```

---

## 🎓 Tutorials and Guides

### Official OpenAI Guides

1. **Building an AI Assistant with OpenAI**
   - URL: https://platform.openai.com/docs/assistants/quickstart
   - Level: Beginner
   - Topics: Basic assistant creation, message handling
   - Code: Python, Node.js examples

2. **File Search Deep Dive**
   - URL: https://platform.openai.com/docs/assistants/tools/file-search/quickstart
   - Level: Intermediate
   - Topics: Vector stores, chunking, citations
   - Use cases: Document Q&A, knowledge base

3. **Streaming Responses**
   - URL: https://platform.openai.com/docs/assistants/streaming
   - Level: Advanced
   - Topics: Real-time response streaming
   - Use cases: Interactive applications

### Community Resources

1. **OpenAI Cookbook**
   - URL: https://cookbook.openai.com/
   - Contains: Practical examples and recipes
   - Topics: Assistants, embeddings, function calling
   - Code: Jupyter notebooks, Python scripts

2. **OpenAI Community Forum**
   - URL: https://community.openai.com/
   - Best for: Questions, discussions, troubleshooting
   - Topics: All OpenAI APIs and tools

3. **GitHub Examples**
   - URL: https://github.com/openai/openai-cookbook
   - Contains: Code examples, best practices
   - Languages: Python, JavaScript, others

---

## 🔧 SDK Documentation

### Official SDKs

#### Python SDK
**Repository:** https://github.com/openai/openai-python
**Documentation:** https://github.com/openai/openai-python#assistants-api

**Installation:**
```bash
pip install openai
```

**Basic usage:**
```python
from openai import OpenAI

client = OpenAI(api_key="YOUR_API_KEY")

# Create assistant
assistant = client.beta.assistants.create(
    name="My Assistant",
    instructions="You are a helpful assistant.",
    model="gpt-4o",
    tools=[{"type": "file_search"}]
)

# Create thread
thread = client.beta.threads.create()

# Add message
message = client.beta.threads.messages.create(
    thread_id=thread.id,
    role="user",
    content="Hello!"
)

# Run assistant
run = client.beta.threads.runs.create(
    thread_id=thread.id,
    assistant_id=assistant.id
)

# Wait for completion and get response
# (polling logic here)
```

#### Node.js SDK
**Repository:** https://github.com/openai/openai-node
**Documentation:** https://github.com/openai/openai-node#assistants-api

**Installation:**
```bash
npm install openai
```

**Basic usage:**
```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Create assistant
const assistant = await openai.beta.assistants.create({
    name: "My Assistant",
    instructions: "You are a helpful assistant.",
    model: "gpt-4o",
    tools: [{type: "file_search"}]
});

// Create thread
const thread = await openai.beta.threads.create();

// Add message
const message = await openai.beta.threads.messages.create(
    thread.id,
    { role: "user", content: "Hello!" }
);

// Run assistant
const run = await openai.beta.threads.runs.create(
    thread.id,
    { assistant_id: assistant.id }
);

// Wait for completion and get response
// (polling logic here)
```

---

## 💰 Pricing Information

**URL:** https://openai.com/api/pricing/

### Assistants API Pricing

**Components:**
1. **Model Usage:** Based on input/output tokens
2. **File Storage:** $0.10 / GB / day (vector stores)
3. **Code Interpreter:** $0.03 per session
4. **File Search:** Included with model usage

**Model Pricing (as of 2024):**
- **gpt-4o:** $5.00 / 1M input tokens, $15.00 / 1M output tokens
- **gpt-4-turbo:** $10.00 / 1M input tokens, $30.00 / 1M output tokens
- **gpt-3.5-turbo:** $0.50 / 1M input tokens, $1.50 / 1M output tokens

**Vector Store Pricing:**
- Storage: $0.10 per GB per day
- Free quota: Varies by account tier
- Automatic deletion of expired stores

---

## 🐛 Troubleshooting Resources

### Common Issues Documentation

1. **Rate Limits**
   - URL: https://platform.openai.com/docs/guides/rate-limits
   - Topics: Rate limit tiers, handling rate limits, retries
   - Solutions: Exponential backoff, batch processing

2. **Error Codes**
   - URL: https://platform.openai.com/docs/guides/error-codes
   - Topics: HTTP status codes, error types, solutions
   - Reference: 400, 401, 429, 500 errors

3. **Safety Best Practices**
   - URL: https://platform.openai.com/docs/guides/safety-best-practices
   - Topics: Moderation, safety guidelines, content filtering
   - Use cases: Production applications

4. **Token Limits**
   - URL: https://platform.openai.com/docs/models/
   - Topics: Model context windows, token counting
   - Tools: Tokenizer, tiktoken library

---

## 📊 Migration Guides

### From Chat Completions to Assistants

**URL:** https://platform.openai.com/docs/assistants/migration

**When to migrate:**
- Need file search capabilities
- Want persistent conversation threads
- Need code interpreter
- Want function calling with state

**When to stay with Chat Completions:**
- Simple question-answer flows
- No file context needed
- Lower latency required
- Simpler implementation preferred

---

## 🎯 Use Case Examples

### Document Q&A System
**Guide:** https://platform.openai.com/docs/assistants/tools/file-search/quickstart

**Steps:**
1. Upload documents to vector store
2. Create assistant with file_search tool
3. Create thread for conversation
4. Ask questions about documents
5. Get answers with citations

**Example code available in documentation**

### Code Analysis Assistant
**Guide:** https://platform.openai.com/docs/assistants/tools/code-interpreter

**Steps:**
1. Create assistant with code_interpreter
2. Upload code files or data
3. Ask for analysis, debugging, or improvements
4. Get code output and visualizations

### Customer Support Bot
**Guide:** https://platform.openai.com/docs/assistants/quickstart

**Steps:**
1. Create assistant with company knowledge base
2. Maintain thread per customer
3. Use function calling for actions (orders, tickets)
4. Provide contextual support

---

## 🔗 Related OpenAI Resources

### General Documentation
- **OpenAI Platform Home:** https://platform.openai.com/
- **API Keys:** https://platform.openai.com/api-keys
- **Usage Dashboard:** https://platform.openai.com/usage
- **Playground:** https://platform.openai.com/playground

### Model Documentation
- **Models Overview:** https://platform.openai.com/docs/models/
- **GPT-4:** https://platform.openai.com/docs/models/gpt-4-and-gpt-4-turbo
- **Embeddings:** https://platform.openai.com/docs/guides/embeddings

### Other APIs
- **Chat Completions:** https://platform.openai.com/docs/guides/chat-completions
- **Completions:** https://platform.openai.com/docs/guides/completions
- **Images:** https://platform.openai.com/docs/guides/images
- **Audio:** https://platform.openai.com/docs/guides/speech-to-text

---

## 📱 Developer Tools

### API Testing
1. **OpenAI Playground**
   - URL: https://platform.openai.com/playground?mode=assistant
   - Features: Interactive testing, no code required
   - Best for: Quick experiments

2. **Postman Collection**
   - Search: "OpenAI API Postman Collection"
   - Features: Pre-built API requests
   - Best for: API testing and exploration

3. **Curl Examples**
   - Available in: API Reference documentation
   - Best for: Command-line testing

### Monitoring
1. **Usage Dashboard**
   - URL: https://platform.openai.com/usage
   - Shows: Token usage, costs, API calls
   - Best for: Budget tracking

2. **Logs**
   - URL: https://platform.openai.com/logs
   - Shows: Recent API requests/responses
   - Best for: Debugging

---

## 🆕 What's New / Changelog

**URL:** https://platform.openai.com/docs/changelog

**Recent updates:**
- New models released
- API improvements
- New features and tools
- Deprecation notices

**Stay updated:**
- Subscribe to changelog
- Follow @OpenAI on Twitter/X
- Join OpenAI Community Forum

---

## 📚 Summary: Essential Resources

### For Beginners:
1. ⭐ Start: https://platform.openai.com/docs/assistants/overview
2. Tutorial: https://platform.openai.com/docs/assistants/quickstart
3. Examples: https://cookbook.openai.com/

### For Implementation:
1. 📖 API Reference: https://platform.openai.com/docs/api-reference/assistants
2. 🐍 Python SDK: https://github.com/openai/openai-python
3. 📜 Node.js SDK: https://github.com/openai/openai-node

### For Troubleshooting:
1. 🐛 Error Codes: https://platform.openai.com/docs/guides/error-codes
2. 💬 Community: https://community.openai.com/
3. 📊 Logs: https://platform.openai.com/logs

### For Learning:
1. 📚 Cookbook: https://cookbook.openai.com/
2. 🎓 Guides: https://platform.openai.com/docs/guides
3. 💰 Pricing: https://openai.com/api/pricing/

---

## 🔖 Quick Reference Card

```
Essential URLs:
├─ Main Docs: platform.openai.com/docs/assistants
├─ API Ref: platform.openai.com/docs/api-reference/assistants
├─ File Search: platform.openai.com/docs/assistants/tools/file-search
├─ Quickstart: platform.openai.com/docs/assistants/quickstart
├─ Pricing: openai.com/api/pricing
├─ Playground: platform.openai.com/playground?mode=assistant
└─ Community: community.openai.com

GitHub Repos:
├─ Python SDK: github.com/openai/openai-python
├─ Node SDK: github.com/openai/openai-node
└─ Cookbook: github.com/openai/openai-cookbook
```

---

**Last Updated:** January 29, 2026  
**Version:** 1.0

**Note:** URLs and documentation may change. Always check the official OpenAI website for the most current information.
