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
        return `You are an academic assistant specialized in helping students understand and answer questions across various subjects, with particular expertise in Computer Architecture 2 (Számítógép architektúrák 2).

Your role is to analyze questions carefully and provide accurate, technically precise answers based on computer science and architecture principles.

When answering questions:
- Apply computer architecture concepts, principles, and best practices
- Consider CPU design, memory hierarchies, instruction sets, pipelining, caching, and system organization
- Reference relevant architectural models and standards when applicable
- Provide technically accurate answers suitable for academic examination
- DO NOT include citation markers (like 【...】) or source references in your answer text
- Provide clean, direct answers without bibliographic notation`;
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
- Answer like a knowledgeable student would: informative yet concise, direct, complete
- Sense from the question what depth of answer is needed - adapt your response accordingly
- Provide COMPLETE answers with essential details, but avoid unnecessary elaboration
- If question asks about interpretation/significance, include definition AND explanation (2-3 sentences)
- For simple "what is" questions, a brief definition may suffice (1 sentence)
- Include technical terms in parentheses when relevant (e.g., TDP = Thermal Design Power)
- Prefer shorter, focused answers over long explanations, but don't be overly terse
- Answer ALWAYS in Hungarian (Magyar nyelven válaszolj, függetlenül a kérdés nyelvétől)
- Think: "What complete, informative answer would a good student give in an exam?"

Response Format:
{
  "type": "text",
  "answer": "Your complete, focused answer here IN HUNGARIAN"
}

Style Examples:
✓ GOOD (definition with explanation): "A TDP (Thermal Design Power), vagyis tervezési hőérték a processzor számításigényes feladatok elvégzés közbeni fogyasztását adja meg. Garantálnia kell, hogy 90 fok fölé ne melegedjen a rendszer."
✗ TOO BRIEF: "TDP: tervezési hőérték, hűtés szabályozása"
✗ TOO LONG: "A TDP egy nagyon fontos koncepció a processzor-tervezésben, amely történelmileg azért alakult ki, hogy a gyártók és a hűtőrendszer-tervezők közös nyelvet találjanak..."

✓ GOOD (simple concept): "A pipelining átfedi az utasítás-végrehajtás fázisait a CPU teljesítmény növeléséhez"

✓ GOOD (cache): "A cache gyors ideiglenes tároló, amely a gyakran használt adatokat tartja a CPU közelében a gyorsabb elérés érdekében"`;
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
     * @param {boolean} forAssistant - Ha true, assistant instructions formátumban adja vissza (csak BASE_PROMPT)
     * @returns {string} A teljes system prompt
     */
    static generate(answerType, answerFieldsCount = 1, forAssistant = false) {
        // For assistants, return only the base prompt (instructions are persistent)
        // The specific question-type instructions will be added to each message
        if (forAssistant) {
            return this.BASE_PROMPT;
        }
        
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
     * Generál question-type specific instructions-t (BASE_PROMPT nélkül)
     * Használatos amikor az assistant már rendelkezik BASE_PROMPT-tal az instructions-ben
     * @param {string} answerType - A kérdés típusa
     * @param {number} answerFieldsCount - Mezők száma MULTIPLE_TEXT típusnál
     * @returns {string} Question-type specific instructions
     */
    static generateTypeInstructions(answerType, answerFieldsCount = 1) {
        const typeInstructions = {
            [AnswerType.RADIO]: this.RADIO_INSTRUCTIONS,
            [AnswerType.CHECKBOX]: this.CHECKBOX_INSTRUCTIONS,
            [AnswerType.SELECT]: this.SELECT_INSTRUCTIONS,
            [AnswerType.TEXT]: this.TEXT_INSTRUCTIONS,
            [AnswerType.MULTIPLE_TEXT]: this.getMultipleTextInstructions(answerFieldsCount),
            [AnswerType.MATCHING]: this.MATCHING_INSTRUCTIONS
        };

        return typeInstructions[answerType] || this.TEXT_INSTRUCTIONS;
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
