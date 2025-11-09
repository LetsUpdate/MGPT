/**
 * System Prompt Generator Module
 * 
 * Ez a modul felelős a GPT system promptok dinamikus generálásáért.
 * Minden kérdéstípushoz optimalizált, célzott instrukciókat generál.
 * 
 * @module systemPromptGenerator
 */

// Answer type enum
const AnswerType = {
    CHECKBOX: 'checkbox',
    RADIO: 'radio',
    TEXT: 'text',
    SELECT: 'select',
    MULTIPLE_TEXT: 'MULTIPLE_TEXT',
    MATCHING: 'matching'
};

/**
 * System Prompt Generator osztály
 * Dinamikusan építi fel a system promptokat a kérdéstípus alapján
 */
class SystemPromptGenerator {
    /**
     * Alapvető prompt, amely minden típusnál megjelenik
     * @private
     */
    static get BASE_PROMPT() {
        return `You are an academic assistant specialized in helping students understand and answer questions across various subjects, with particular expertise in Az adóoptimalizálás és a gazdaság kifehérítése.

Your role is to analyze questions carefully and provide accurate answers.`;
    }

    /**
     * RADIO (single choice) típusú kérdésekhez
     * @private
     */
    static get RADIO_INSTRUCTIONS() {
        return `
Current Question Type: RADIO (Single Choice)

Instructions:
- Analyze all provided options carefully
- Select EXACTLY ONE correct answer
- Think through why each option is right or wrong
- Return the answer as a zero-based index (0, 1, 2, etc.)

Response Format:
{
  "type": "radio",
  "correctAnswers": [index]  // Single index number, e.g., [2]
}

Important: You MUST return the answer as a numeric index (0-based) referring to the "Possible answers" list, NOT the answer text.`;
    }

    /**
     * CHECKBOX (multiple choice) típusú kérdésekhez
     * @private
     */
    static get CHECKBOX_INSTRUCTIONS() {
        return `
Current Question Type: CHECKBOX (Multiple Choice)

Instructions:
- Analyze all provided options carefully
- Select ALL correct answers (can be one, multiple, or all)
- Consider each option independently
- Return answers as zero-based indices (0, 1, 2, etc.)

Response Format:
{
  "type": "checkbox",
  "correctAnswers": [index1, index2, ...]  // Array of index numbers, e.g., [0, 2, 4]
}

Important: You MUST return answers as numeric indices (0-based) referring to the "Possible answers" list, NOT the answer text.`;
    }

    /**
     * SELECT (dropdown multiple selection) típusú kérdésekhez
     * @private
     */
    static get SELECT_INSTRUCTIONS() {
        return `
Current Question Type: SELECT (Dropdown Multiple Selection)

Instructions:
- Analyze all provided options carefully
- Select ALL applicable answers
- Consider the context and requirements
- Return answers as zero-based indices (0, 1, 2, etc.)

Response Format:
{
  "type": "select",
  "correctAnswers": [index1, index2, ...]  // Array of index numbers, e.g., [1, 3]
}

Important: You MUST return answers as numeric indices (0-based) referring to the "Possible answers" list, NOT the answer text.`;
    }

    /**
     * TEXT (free text answer) típusú kérdésekhez
     * @private
     */
    static get TEXT_INSTRUCTIONS() {
        return `
Current Question Type: TEXT (Free Text Answer)

Instructions:
- Provide a clear, concise text answer
- Be accurate and to the point
- No need for lengthy explanations unless necessary
- Answer in the same language as the question

Response Format:
{
  "type": "text",
  "answer": "Your answer here"
}`;
    }

    /**
     * MULTIPLE_TEXT (multiple text fields) típusú kérdésekhez
     * @private
     * @param {number} fieldCount - Mezők száma
     */
    static getMultipleTextInstructions(fieldCount = 1) {
        return `
Current Question Type: MULTIPLE_TEXT (Multiple Text Fields)

Instructions:
- This question has ${fieldCount} separate answer fields
- Provide EXACTLY ${fieldCount} separate answers
- Each answer corresponds to one field in order
- Be concise and accurate for each field

Response Format:
{
  "type": "MULTIPLE_TEXT",
  "correctAnswers": ["answer1", "answer2", "answer3", ...]
}

Important: Provide exactly ${fieldCount} answers in the array, one for each field in order.`;
    }

    /**
     * MATCHING (match pairs) típusú kérdésekhez
     * @private
     */
    static get MATCHING_INSTRUCTIONS() {
        return `
Current Question Type: MATCHING (Match Pairs)

Instructions:
- Match each item on the left with the correct definition/description on the right
- Consider the meaning and context carefully
- Provide the text of the matching option for each item

Response Format:
{
  "type": "matching",
  "correctAnswers": {
    "item1": "matching option text",
    "item2": "matching option text",
    ...
  }
}`;
    }

    /**
     * Generál egy teljes system promptot a megadott kérdéstípushoz
     * @param {string} answerType - A kérdés típusa (AnswerType enum értéke)
     * @param {number} answerFieldsCount - Mezők száma MULTIPLE_TEXT típusnál
     * @returns {string} A teljes system prompt
     */
    static generate(answerType, answerFieldsCount = 1) {
        const typeInstructions = {
            [AnswerType.RADIO]: this.RADIO_INSTRUCTIONS,
            [AnswerType.CHECKBOX]: this.CHECKBOX_INSTRUCTIONS,
            [AnswerType.SELECT]: this.SELECT_INSTRUCTIONS,
            [AnswerType.TEXT]: this.TEXT_INSTRUCTIONS,
            [AnswerType.MULTIPLE_TEXT]: this.getMultipleTextInstructions(answerFieldsCount),
            [AnswerType.MATCHING]: this.MATCHING_INSTRUCTIONS
        };

        const specificInstructions = typeInstructions[answerType] || this.TEXT_INSTRUCTIONS;
        return this.BASE_PROMPT + '\n' + specificInstructions;
    }

    /**
     * Ellenőrzi hogy valid kérdéstípus-e
     * @param {string} answerType - A kérdés típusa
     * @returns {boolean} True ha valid, false egyébként
     */
    static isValidAnswerType(answerType) {
        return Object.values(AnswerType).includes(answerType);
    }

    /**
     * Visszaadja az összes támogatott kérdéstípust
     * @returns {Object} AnswerType enum
     */
    static getAnswerTypes() {
        return AnswerType;
    }
}

// Export
module.exports = SystemPromptGenerator;
