/**
 * ============================================================================
 * DICTIONARY.JS - Full 370,105-Word Lexicon & Common Words Setup
 * ============================================================================
 * 
 * VIVA EXPLANATION:
 * -----------------
 * Q: How many words are loaded in the dictionary?
 * A: Exactly 370,105 words loaded from the official corpus/dictionary.txt.
 * 
 * Q: How does the system handle 370,105 words efficiently?
 * A: The entire lexicon is indexed into a Prefix Tree (Trie) at startup.
 *    Because Trie lookup is O(L) where L is the length of the query word,
 *    checking any word takes at most L character steps, completely independent
 *    of the 370,105 words stored in memory.
 */

// Use the full 370,105 words pre-loaded in window.FULL_DICTIONARY_WORDS
const DEFAULT_DICTIONARY_WORDS = window.FULL_DICTIONARY_WORDS || [];

// Use the complete 1,072 common English words from corpus/common_words.txt
const COMMON_WORDS_SET = new Set(window.COMMON_WORDS_ARRAY || []);

// Export for global application use
window.DEFAULT_DICTIONARY_WORDS = DEFAULT_DICTIONARY_WORDS;
window.COMMON_WORDS_SET = COMMON_WORDS_SET;
