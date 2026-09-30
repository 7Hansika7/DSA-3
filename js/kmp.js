/**
 * ============================================================================
 * KMP.JS - Knuth-Morris-Pratt Algorithm Integrated with Error Detection
 * ============================================================================
 * 
 * VIVA & THEORETICAL ANALYSIS:
 * ----------------------------
 * Q: What is KMP (Knuth-Morris-Pratt)?
 * A: KMP is a linear-time exact string-matching algorithm that searches for
 *    occurrences of a "pattern" string within a "text" string in O(n + m) time.
 * 
 * Q: How does KMP improve upon the Naive approach?
 * A: - Naive Search: On mismatch, naive search retreats the text pointer backwards
 *      and restarts comparison from the next character. Worst-case time: O(n * m).
 *    - KMP Search: The text index 'i' NEVER moves backward. When a mismatch occurs,
 *      KMP utilizes precomputed knowledge of the pattern itself (the LPS table)
 *      to determine the next position to check, skipping useless comparisons.
 * 
 * Q: What is the LPS Table (Longest Proper Prefix which is also a Suffix)?
 * A: LPS[i] stores the length of the longest proper prefix of pattern[0...i]
 *    that is also a suffix of pattern[0...i].
 *    Example for pattern "ababc":
 *      Index:   0  1  2  3  4
 *      Char:    a  b  a  b  c
 *      LPS:     0  0  1  2  0
 *    At index 3 ("abab"), "ab" (length 2) is both prefix and suffix!
 * 
 * Q: How do we integrate KMP with Spell Checking & Error Detection?
 * A: Standalone KMP only finds exact matches. To make it a true Error Detector:
 *    1. KMP locates exact occurrences of erroneous patterns or candidate typos.
 *    2. Instead of returning a bare index, it extracts:
 *       - Exact Start and End character indices [start...end]
 *       - Line number and Word number in the document
 *       - Full contextual window (visualizing error in sentence)
 *       - Dictionary validation (confirms it is missing from Trie)
 *       - Top 3 valid corrections from the Suggestion Engine!
 */

class KMP {
    /**
     * Builds the Longest Prefix-Suffix (LPS) table for the given pattern.
     * Time Complexity: O(m) where m = pattern.length
     * Space Complexity: O(m)
     * 
     * @param {string} pattern - Search pattern
     * @returns {{lps: number[], steps: Array<{index: number, char: string, lpsVal: number, explanation: string}>}}
     */
    static buildLPSTable(pattern) {
        const m = pattern.length;
        const lps = new Array(m).fill(0);
        const steps = [];

        if (m === 0) return { lps, steps };

        let length = 0; // length of previous longest prefix suffix
        let i = 1;

        steps.push({
            index: 0,
            char: pattern[0],
            lpsVal: 0,
            explanation: `lps[0] is always 0 because a proper prefix of length 1 cannot be the whole string.`
        });

        while (i < m) {
            if (pattern[i] === pattern[length]) {
                length++;
                lps[i] = length;
                steps.push({
                    index: i,
                    char: pattern[i],
                    lpsVal: length,
                    explanation: `Match! '${pattern[i]}' == '${pattern[length - 1]}'. Expanding prefix-suffix length to ${length}.`
                });
                i++;
            } else {
                if (length !== 0) {
                    // Fall back to previous longest prefix suffix
                    const prevLength = length;
                    length = lps[length - 1];
                    steps.push({
                        index: i,
                        char: pattern[i],
                        lpsVal: lps[i],
                        explanation: `Mismatch at '${pattern[i]}'. Falling back from length ${prevLength} to lps[${prevLength - 1}] = ${length}.`
                    });
                    // Note: do not increment i here!
                } else {
                    lps[i] = 0;
                    steps.push({
                        index: i,
                        char: pattern[i],
                        lpsVal: 0,
                        explanation: `Mismatch with length 0. Setting lps[${i}] = 0.`
                    });
                    i++;
                }
            }
        }

        return { lps, steps };
    }

    /**
     * Performs KMP pattern search over text with full contextual error detection.
     * 
     * @param {string} text - Full text document
     * @param {string} pattern - Target pattern / typo to search
     * @param {Trie} trie - Dictionary Trie to verify error status
     * @param {string[]} dictionaryWords - Full dictionary for generating top suggestions
     * @param {Set<string>} commonWordsSet - Common words set for suggestion ranking
     * @returns {Array<Object>} List of detailed error detection results
     */
    static searchWithContext(text, pattern, trie, dictionaryWords, commonWordsSet) {
        const results = [];
        if (!text || !pattern) return results;

        const n = text.length;
        const m = pattern.length;
        if (m > n) return results;

        const { lps } = this.buildLPSTable(pattern);
        let i = 0; // index for text
        let j = 0; // index for pattern

        while (i < n) {
            if (pattern[j].toLowerCase() === text[i].toLowerCase()) {
                i++;
                j++;
            }

            if (j === m) {
                // Exact match found at index (i - j)
                const startIndex = i - j;
                const endIndex = i - 1;

                // Check if this matched pattern is a standalone word or token boundary
                const isWordStart = (startIndex === 0 || /[^a-zA-Z0-9]/.test(text[startIndex - 1]));
                const isWordEnd = (endIndex === n - 1 || /[^a-zA-Z0-9]/.test(text[endIndex + 1]));
                const isStandaloneWord = isWordStart && isWordEnd;

                // Verify if it is an error in the dictionary
                const isError = trie ? !trie.contains(pattern) : true;

                // Compute line number and column number
                const textUpToMatch = text.substring(0, startIndex);
                const lines = textUpToMatch.split("\n");
                const lineNumber = lines.length;
                const columnNumber = lines[lines.length - 1].length + 1;

                // Compute word number in the document
                const wordsBefore = textUpToMatch.trim().split(/\s+/).filter(Boolean).length;
                const wordIndex = wordsBefore + 1;

                // Extract surrounding context snippet (15 chars before & after)
                const contextStart = Math.max(0, startIndex - 20);
                const contextEnd = Math.min(n, endIndex + 21);
                const prefixSnippet = (contextStart > 0 ? "..." : "") + text.substring(contextStart, startIndex);
                const matchedSnippet = text.substring(startIndex, endIndex + 1);
                const suffixSnippet = text.substring(endIndex + 1, contextEnd) + (contextEnd < n ? "..." : "");

                // Generate TOP 3 Suggestions if it is an error
                let topSuggestions = [];
                if (isError && dictionaryWords && dictionaryWords.length > 0) {
                    topSuggestions = SuggestionEngine.getTopSuggestions(pattern, dictionaryWords, commonWordsSet, 2);
                }

                results.push({
                    pattern: pattern,
                    startIndex: startIndex,
                    endIndex: endIndex,
                    length: m,
                    lineNumber: lineNumber,
                    columnNumber: columnNumber,
                    wordIndex: wordIndex,
                    isStandaloneWord: isStandaloneWord,
                    isError: isError,
                    context: {
                        prefix: prefixSnippet,
                        match: matchedSnippet,
                        suffix: suffixSnippet
                    },
                    topSuggestions: topSuggestions
                });

                // Reset j using LPS table to find subsequent / overlapping occurrences
                j = lps[j - 1];
            } else if (i < n && pattern[j].toLowerCase() !== text[i].toLowerCase()) {
                if (j !== 0) {
                    j = lps[j - 1];
                } else {
                    i++;
                }
            }
        }

        return results;
    }
}

// Export for global browser window
window.KMP = KMP;
