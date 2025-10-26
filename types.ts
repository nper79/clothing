export type Answer = string | string[] | number;

export interface Answers {
  [key: string]: Answer;
}

export type QuestionType = "single" | "multiple" | "slider" | "range";

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[];
}

export interface Explanation {
    title: string;
    whyItWorks: string;
    occasions: string;
    preferredFit: string;
    constraints: string;
}

export interface StyleSuggestion {
    theme: string;
    image: string;
    explanation: Explanation;
}

export interface DislikedStyle {
    theme: string;
    reason: string;
}

export enum AppState {
    QUESTIONNAIRE,
    IMAGE_UPLOAD,
    LOADING,
    RESULTS,
    ERROR,
    FEEDBACK
}