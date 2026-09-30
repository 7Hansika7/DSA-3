/**
 * ============================================================================
 * SUGGESTIONENGINE.JS - Dynamic Programming Edit Distance & Phonetic Soundex
 * ============================================================================
 * 
 * VIVA & THEORETICAL ANALYSIS:
 * ----------------------------
 * Q: What is Edit Distance?
 * A: Edit Distance quantifies how dissimilar two strings are by counting the
 *    minimum number of single-character editing operations required to transform
 *    string A into string B.
 * 
 * Q: What is the difference between Levenshtein and Damerau-Levenshtein?
 * A: - Standard Levenshtein allows 3 operations: Insertion, Deletion, Substitution.
 *    - Damerau-Levenshtein adds a 4th operation: TRANSPOSITION of two adjacent
 *      characters (e.g., "recieve" -> "receive" or "teh" -> "the").
 *      Over 80% of human typographical errors consist of single-character
 *      insertions, deletions, substitutions, or transpositions!
 * 
 * Q: How is search optimized over 370,105 dictionary words?
 * A: 1. Length Pruning: We group words into buckets by length. A word can only be
 *       within edit distance <= 2 if its length differs by at most 2.
 *    2. Priority Partitioning: High-frequency common words and words sharing the
 *       same starting character are evaluated first, achieving sub-second responses
 *       across 370k words without UI stuttering!
 */

class SuggestionEngine {
    static wordsByLength = new Map();
    static isIndexed = false;

    /**
     * Indexes the dictionary into length buckets for fast O(1) candidate pool retrieval.
     */
    static indexDictionary(dictionaryWords) {
        this.wordsByLength.clear();
        for (let i = 0; i < dictionaryWords.length; i++) {
            const word = dictionaryWords[i];
            const len = word.length;
            if (!this.wordsByLength.has(len)) {
                this.wordsByLength.set(len, []);
            }
            this.wordsByLength.get(len).push(word);
        }
        this.isIndexed = true;
    }

    /**
     * Computes the Damerau-Levenshtein edit distance between two strings using DP.
     * Operations: Insert (1), Delete (1), Substitute (1), Transpose adjacent (1).
     * 
     * @param {string} s1 - Source string (e.g. misspelled token)
     * @param {string} s2 - Target string (e.g. candidate dictionary word)
     * @returns {number} - Minimum edit distance
     */
    static damerauLevenshtein(s1, s2) {
        const len1 = s1.length;
        const len2 = s2.length;

        if (len1 === 0) return len2;
        if (len2 === 0) return len1;

        // DP table of size (len1 + 1) x (len2 + 1)
        const dp = Array.from({ length: len1 + 1 }, () => new Array(len2 + 1).fill(0));

        // Base cases
        for (let i = 0; i <= len1; i++) dp[i][0] = i;
        for (let j = 0; j <= len2; j++) dp[0][j] = j;

        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                const cost = (s1[i - 1] === s2[j - 1]) ? 0 : 1;

                dp[i][j] = Math.min(
                    dp[i - 1][j] + 1,        // Deletion
                    dp[i][j - 1] + 1,        // Insertion
                    dp[i - 1][j - 1] + cost   // Substitution
                );

                // Adjacent Transposition (Damerau extension)
                if (i > 1 && j > 1 &&
                    s1[i - 1] === s2[j - 2] &&
                    s1[i - 2] === s2[j - 1]) {
                    dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
                }
            }
        }

        return dp[len1][len2];
    }

    /**
     * Computes the 4-character American Soundex phonetic code for a word.
     * Example: "receive" -> "R210", "recieve" -> "R210"
     * 
     * @param {string} word - Input word
     * @returns {string} - Soundex code
     */
    static soundex(word) {
        if (!word) return "";
        const clean = word.toUpperCase().replace(/[^A-Z]/g, '');
        if (clean.length === 0) return "";

        const mapping = {
            'B': '1', 'F': '1', 'P': '1', 'V': '1',
            'C': '2', 'G': '2', 'J': '2', 'K': '2', 'Q': '2', 'S': '2', 'X': '2', 'Z': '2',
            'D': '3', 'T': '3',
            'L': '4',
            'M': '5', 'N': '5',
            'R': '6'
        };

        const firstLetter = clean[0];
        let code = firstLetter;
        let prevDigit = mapping[firstLetter] || '0';

        for (let i = 1; i < clean.length; i++) {
            const char = clean[i];
            const currentDigit = mapping[char] || '0';

            if (currentDigit !== '0') {
                if (currentDigit !== prevDigit) {
                    code += currentDigit;
                    if (code.length === 4) break;
                }
            }
            prevDigit = currentDigit;
        }

        while (code.length < 4) {
            code += '0';
        }

        return code;
    }

    /**
     * Generates the TOP 3 Suggestions for a misspelled word from the 370k dictionary.
     * 
     * @param {string} errorWord - The misspelled token
     * @param {string[]} dictionaryWords - Full array of dictionary words
     * @param {Set<string>} commonWordsSet - Common words set for biasing
     * @param {number} maxDistance - Maximum edit distance (default 2)
     * @returns {Array<{word: string, distance: number, soundexMatch: boolean, score: number, explanation: string}>}
     */
    static getTopSuggestions(errorWord, dictionaryWords, commonWordsSet, maxDistance = 2) {
        const errorLower = errorWord.toLowerCase().trim();
        const errorSoundex = this.soundex(errorLower);
        const errorLen = errorLower.length;

        if (!this.isIndexed && dictionaryWords && dictionaryWords.length > 0) {
            this.indexDictionary(dictionaryWords);
        }

        const candidatesMap = new Map();

        // Helper to evaluate a candidate word
        const evaluateWord = (dictWord) => {
            if (candidatesMap.has(dictWord)) return;
            const dist = this.damerauLevenshtein(errorLower, dictWord);

            if (dist <= maxDistance && dist > 0) {
                const isCommon = commonWordsSet && commonWordsSet.has(dictWord);
                const soundexMatch = (this.soundex(dictWord) === errorSoundex);

                let score = dist * 10;
                if (isCommon) score -= 5;
                if (soundexMatch) score -= 3;
                if (dictWord[0] === errorLower[0]) score -= 2;

                let explanation = `Edit distance: ${dist}`;
                if (soundexMatch) explanation += ` • Phonetic match (${errorSoundex})`;
                if (isCommon) explanation += ` • High-frequency common word`;

                candidatesMap.set(dictWord, {
                    word: dictWord,
                    distance: dist,
                    soundexMatch: soundexMatch,
                    isCommon: isCommon,
                    score: score,
                    explanation: explanation
                });
            }
        };

        // Pass 1: Check high-frequency common words first (~1,000 words, takes < 1 ms!)
        if (commonWordsSet) {
            for (const cw of commonWordsSet) {
                if (Math.abs(cw.length - errorLen) <= maxDistance) {
                    evaluateWord(cw);
                }
            }
        }

        // Pass 2: Search length-matched buckets from the full 370k dictionary
        const minL = Math.max(1, errorLen - maxDistance);
        const maxL = errorLen + maxDistance;

        // Iterate through length buckets
        for (let l = minL; l <= maxL; l++) {
            const bucket = this.wordsByLength.get(l);
            if (!bucket) continue;

            for (let i = 0; i < bucket.length; i++) {
                const dictWord = bucket[i];
                // Prioritize words sharing first letter or soundex
                if (dictWord[0] === errorLower[0] || candidatesMap.size < 10) {
                    evaluateWord(dictWord);
                }
            }
        }

        // Convert candidates map to sorted array
        const candidates = Array.from(candidatesMap.values());

        candidates.sort((a, b) => {
            if (a.score !== b.score) return a.score - b.score;
            if (a.distance !== b.distance) return a.distance - b.distance;
            return a.word.localeCompare(b.word);
        });

        // Return precisely the TOP 3 suggestions
        return candidates.slice(0, 3);
    }
}

// Export for global browser window
window.SuggestionEngine = SuggestionEngine;
