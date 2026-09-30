/**
 * ============================================================================
 * AHOCORASICK.JS - Multi-Pattern String Matching Automaton
 * ============================================================================
 * 
 * VIVA & THEORETICAL ANALYSIS:
 * ----------------------------
 * Q: What is the Aho-Corasick Algorithm?
 * A: Aho-Corasick is a multi-pattern exact string searching algorithm that locates
 *    ALL occurrences of a finite set of keywords simultaneously in a single pass.
 * 
 * Q: How does Aho-Corasick work?
 * A: It combines three core ideas:
 *    1. A Trie containing all patterns to search.
 *    2. Failure Links (similar to KMP's LPS table, but over a Trie):
 *       If a branch fails on character 'c', the failure link jumps to the longest
 *       proper suffix of the current prefix that exists as a node in the Trie.
 *    3. Output Links: Collects all matched patterns that end at the current node
 *       or its suffix failure nodes.
 * 
 * Q: What is the Time and Space Complexity?
 * A: - Building Trie: O(M) where M is total length of all pattern strings.
 *    - Building Failure Links (BFS): O(M * ALPHABET_SIZE).
 *    - Text Search: O(N + Z) where N is text length and Z is total matches found!
 *    - Space: O(M * ALPHABET_SIZE).
 *    *CRITICAL VIVA POINT*: Aho-Corasick's search time depends ONLY on the text
 *    length N and number of matches Z, regardless of whether you have 10 patterns
 *    or 10,000 patterns!
 * 
 * Q: Why can't Aho-Corasick do general spelling correction alone?
 * A: Aho-Corasick is an EXACT multi-pattern matcher. It can only find patterns
 *    you already know in advance (e.g. a database of 500 known common typos).
 *    It cannot dynamically guess unknown typos—that requires Trie + Edit Distance!
 */

class ACNode {
    constructor() {
        this.children = {};        // transitions for characters
        this.fail = null;          // failure pointer
        this.output = [];          // list of patterns that end at this node
        this.isWord = false;
    }
}

class AhoCorasick {
    constructor(patterns = []) {
        this.root = new ACNode();
        this.patterns = patterns;
        this.buildTrie(patterns);
        this.buildFailureLinks();
    }

    /**
     * Step 1: Insert all search patterns into the Trie.
     */
    buildTrie(patterns) {
        for (const pattern of patterns) {
            if (!pattern) continue;
            const p = pattern.toLowerCase();
            let current = this.root;

            for (let i = 0; i < p.length; i++) {
                const char = p[i];
                if (!current.children[char]) {
                    current.children[char] = new ACNode();
                }
                current = current.children[char];
            }
            current.isWord = true;
            current.output.push(pattern);
        }
    }

    /**
     * Step 2: Build failure and dictionary output links using Breadth-First Search (BFS).
     */
    buildFailureLinks() {
        const queue = [];

        // All depth-1 children have root as their failure link
        for (const char in this.root.children) {
            const child = this.root.children[char];
            child.fail = this.root;
            queue.push(child);
        }

        while (queue.length > 0) {
            const current = queue.shift();

            for (const char in current.children) {
                const child = current.children[char];
                let failureTarget = current.fail;

                // Trace back failure links until a matching transition is found or root is reached
                while (failureTarget !== null && !failureTarget.children[char]) {
                    failureTarget = failureTarget.fail;
                }

                child.fail = failureTarget ? failureTarget.children[char] : this.root;

                // Merge output patterns from failure node
                if (child.fail && child.fail.output.length > 0) {
                    child.output = child.output.concat(child.fail.output);
                }

                queue.push(child);
            }
        }
    }

    /**
     * Searches for all pattern matches in the input text in a single pass O(n + z).
     * 
     * @param {string} text - The input text
     * @returns {Array<{pattern: string, startIndex: number, endIndex: number}>}
     */
    search(text) {
        const matches = [];
        if (!text) return matches;

        let current = this.root;
        const lowerText = text.toLowerCase();

        for (let i = 0; i < lowerText.length; i++) {
            const char = lowerText[i];

            // Follow failure links if current character transition does not exist
            while (current !== this.root && !current.children[char]) {
                current = current.fail || this.root;
            }

            if (current.children[char]) {
                current = current.children[char];
            } else {
                current = this.root;
            }

            // If current node has pattern outputs, record them
            if (current.output.length > 0) {
                for (const matchedPattern of current.output) {
                    const startIndex = i - matchedPattern.length + 1;
                    matches.push({
                        pattern: matchedPattern,
                        startIndex: startIndex,
                        endIndex: i,
                        length: matchedPattern.length
                    });
                }
            }
        }

        return matches;
    }
}

// Export for global browser window
window.AhoCorasick = AhoCorasick;
window.ACNode = ACNode;
