/**
 * Centralized AI Configuration
 * Defines model names, fallback orders, and default parameters for Gemini integration.
 */

const AI_CONFIG = {
    // Chat Models (Sequential Fallback)
    chat: {
        models: [
            "gemini-2.5-flash-lite", // Primary (User requested)
            "gemini-2.0-flash"       // Fallback
        ],
        temperature: 0.7,
        maxOutputTokens: 1000,
    },

    // Evaluation Models (Complex Reasoning)
    evaluation: {
        model: "gemini-2.5-flash",
        fallbackModel: "gemini-2.5-flash-lite",
        lastResortModel: "gemini-2.0-flash",
        temperature: 0.3,
        maxOutputTokens: 2000,
    },

    // Audio Transcription Models
    transcription: {
        model: "gemini-2.5-flash-lite", // Fast & Cost-effective
    },

    // Semantic Analysis / Helper Models
    analysis: {
        model: "gemini-2.5-flash-lite",
    }
};

module.exports = AI_CONFIG;
