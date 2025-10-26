declare module 'questionSolver' {
    export interface QuestionElements {
        questionElement: Element;     // Raw question DOM element
        answerElements: Element[];    // Raw answer DOM elements
        parentNode: Element;          // Container element
    }

    export interface QuestionImage {
        element: Element;             // Image DOM element
        src: string;                  // Image source URL
        alt: string;                  // Alt text
        title: string;                // Title text
    }

    export interface QuestionAnswer {
        type: 'text' | 'radio' | 'checkbox' | 'select';  // Answer type
        text: string;                 // Processed answer text
        value: string;                // Answer value
        element: Element;             // Reference to the DOM element
    }

    export interface QuestionData {
        question: string;             // Processed question text
        type: 'text' | 'radio' | 'checkbox' | 'select';  // Question/answer type
        answers: QuestionAnswer[];     // Array of processed answers
        images: QuestionImage[];      // Array of images in the question
    }

    export interface QuestionResult {
        elements: QuestionElements;    // Raw DOM elements
        data: QuestionData;           // Processed data
        success: boolean;             // Processing success status
    }

    export class QuestionSolver {
        constructor();
        
        /**
         * Initialize the question solver
         */
        init(): void;

        /**
         * Handle matching the current page against known patterns
         * @param url - The URL to match
         */
        handlePageMatch(url: string): void;

        /**
         * Handle Canvas quiz pages
         * @param url - The quiz page URL
         */
        handleCanvasQuiz(url: string): Promise<QuestionResult[]>;

        /**
         * Handle Moodle quiz pages
         * @param url - The quiz page URL
         */
        handleMoodleQuiz(url: string): Promise<QuestionResult[]>;

        /**
         * Get all questions from the current quiz page
         * @returns Array of processed questions
         */
        getQuizData(): Promise<QuestionResult[]>;

        /**
         * Get question nodes from the page
         * @returns Array of question DOM nodes
         */
        getQuestionNodes(): Element[] | null;

        /**
         * Process a single question node
         * @param node - The question DOM node
         * @returns Processed question data
         */
        getQuestionPromiseForSingleQuestion(node: Element): Promise<QuestionResult>;

        /**
         * Get the type of answer for a question
         * @param node - The question DOM node
         * @returns The answer type
         */
        getAnswerType(node: Element): Promise<'text' | 'radio' | 'checkbox' | 'select'>;

        /**
         * Get answer elements based on type
         * @param node - The question DOM node
         * @param type - The answer type
         * @returns Array of answer elements
         */
        getAnswerElementsByType(node: Element, type: string): Promise<Element[]>;

        /**
         * Find text content associated with an answer element
         * @param element - The answer input element
         * @returns The associated text
         */
        findAnswerText(element: Element): string;
    }

    const questionSolver: QuestionSolver;
    export default questionSolver;
}