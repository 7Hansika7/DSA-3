/**
 * ============================================================================
 * TRIE.JS - Prefix Tree Data Structure for Fast O(L) Dictionary Lookup
 * ============================================================================
 * 
 * VIVA & THEORETICAL ANALYSIS:
 * ----------------------------
 * Q: What is a Trie?
 * A: A Trie (pronounced "try" or "tree", from reTRIEval) is an ordered tree
 *    data structure where keys are typically strings. Unlike a binary search tree,
 *    no node in the tree stores the entire key. Instead, its position in the
 *    tree defines the key with which it is associated.
 * 
 * Q: What is the Time Complexity of Trie operations?
 * A: - Insertion: O(L) where L is the length of the word.
 *    - Search (Lookup): O(L) where L is the length of the query word.
 *    - Prefix Search: O(P) where P is the length of the prefix.
 *    *CRITICAL VIVA POINT*: The search time is completely INDEPENDENT of the
 *    number of words stored in the dictionary (N). Whether we have 10 words
 *    or 1,000,000 words, looking up a 6-letter word always takes at most 6 steps!
 * 
 * Q: What is the Space Complexity of a Trie?
 * A: - Worst-case Space: O(ALPHABET_SIZE * L * N), where each node maintains
 *      pointers to child nodes. Common prefixes share nodes, saving space for
 *      large lexicons with shared prefixes.
 * 
 * Q: Why not use a Hash Table?
 * A: Hash tables have average O(L) lookup, but:
 *    1. Hash tables cannot easily perform prefix searches (auto-complete).
 *    2. Hash tables suffer from hash collisions and worst-case O(N) degradation.
 *    3. Tries provide predictable worst-case guarantees and prefix pruning.
 */

class TrieNode {
    constructor() {
        // Map containing character -> TrieNode transitions.
        // Using an object or Map allows handling case-insensitive alphabet.
        this.children = {};
        
        // Flag indicating whether this node marks the end of a complete valid word.
        this.isEndOfWord = false;
        
        // Optional frequency weight / occurrence count
        this.frequency = 0;
    }
}

class Trie {
    constructor() {
        this.root = new TrieNode();
        this.wordCount = 0;
        this.nodeCount = 1; // root node
    }

    /**
     * Inserts a word into the Trie.
     * Time Complexity: O(L) where L = word.length
     * Space Complexity: O(L) in the worst case (if brand new branch)
     * 
     * @param {string} word - Word to insert into the dictionary
     */
    insert(word) {
        if (!word) return;
        const normalized = word.toLowerCase().trim();
        let current = this.root;

        for (let i = 0; i < normalized.length; i++) {
            const char = normalized[i];
            if (!current.children[char]) {
                current.children[char] = new TrieNode();
                this.nodeCount++;
            }
            current = current.children[char];
        }

        if (!current.isEndOfWord) {
            current.isEndOfWord = true;
            this.wordCount++;
        }
        current.frequency++;
    }

    /**
     * Checks if a word exists in the dictionary.
     * Time Complexity: O(L) where L = word.length
     * 
     * @param {string} word - The token to check
     * @returns {boolean} - True if the exact word is in the Trie, false otherwise
     */
    contains(word) {
        if (!word) return false;
        const normalized = word.toLowerCase().trim();
        let current = this.root;

        for (let i = 0; i < normalized.length; i++) {
            const char = normalized[i];
            if (!current.children[char]) {
                return false; // Character transition missing -> not in dictionary
            }
            current = current.children[char];
        }

        // Must be marked as a complete word (not just a prefix of another word)
        return current.isEndOfWord;
    }

    /**
     * Checks if any word in the dictionary starts with the given prefix.
     * Time Complexity: O(P) where P = prefix.length
     * 
     * @param {string} prefix - The prefix string
     * @returns {boolean} - True if prefix exists
     */
    startsWith(prefix) {
        if (!prefix) return false;
        const normalized = prefix.toLowerCase().trim();
        let current = this.root;

        for (let i = 0; i < normalized.length; i++) {
            const char = normalized[i];
            if (!current.children[char]) {
                return false;
            }
            current = current.children[char];
        }
        return true;
    }

    /**
     * Retrieves up to `limit` words starting with the specified prefix.
     * Useful for auto-complete and predictive suggestion features.
     * 
     * @param {string} prefix 
     * @param {number} limit 
     * @returns {string[]}
     */
    getWordsWithPrefix(prefix, limit = 10) {
        const results = [];
        const normalized = prefix.toLowerCase().trim();
        let current = this.root;

        for (let i = 0; i < normalized.length; i++) {
            const char = normalized[i];
            if (!current.children[char]) {
                return results;
            }
            current = current.children[char];
        }

        // DFS to collect words beneath this node
        function dfs(node, path) {
            if (results.length >= limit) return;
            if (node.isEndOfWord) {
                results.push(path);
            }
            for (const char of Object.keys(node.children).sort()) {
                dfs(node.children[char], path + char);
            }
        }

        dfs(current, normalized);
        return results;
    }

    /**
     * Clears and resets the Trie.
     */
    clear() {
        this.root = new TrieNode();
        this.wordCount = 0;
        this.nodeCount = 1;
    }
}

// Export for global browser window
window.Trie = Trie;
window.TrieNode = TrieNode;
