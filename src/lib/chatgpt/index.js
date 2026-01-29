/**
 * ChatGPT Library - Main Export
 * Provides modular access to ChatGPT API clients and utilities
 */

const ChatGPTClient = require('./client');
const ResponsesAPIClient = require('./responsesClient');

module.exports = {
    ChatGPTClient,
    ResponsesAPIClient
};
