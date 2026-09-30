/**
 * ============================================================================
 * APP.JS - UI Controller, Event Handlers, & Interactive Visualizer
 * ============================================================================
 * 
 * Coordinates the full suite of string algorithms:
 * 1. Trie Dictionary Verification
 * 2. SuggestionEngine Top-3 Error Replacement
 * 3. KMP Contextual Pattern & Error Locator
 * 4. Aho-Corasick Multi-Pattern Automaton Scanner
 * 5. Max Flow (Edmonds-Karp & Dinic's) Bipartite Suggestion Matcher
 * 6. Algorithm Comparison Matrix & High-Precision Benchmark
 */

// Global State
const state = {
    trie: null,
    dictionaryWords: [],
    commonWordsSet: null,
    isDictionaryLoaded: false,
    currentTab: "spellcheck",
    activeEkStep: 0,
    activeDinicPhase: 0,
    lastFlowData: null
};

// Initialize Application on DOM Ready
document.addEventListener("DOMContentLoaded", () => {
    initDictionary();
    setupNavigation();
    setupEventListeners();
    runSpellCheck(); // Run initial sample
});

/**
 * Initializes the full 370,105-word dictionary into the Trie.
 */
function initDictionary() {
    const statusEl = document.getElementById("dict-status");
    if (statusEl) statusEl.textContent = "Loading 370k lexicon...";

    state.dictionaryWords = window.FULL_DICTIONARY_WORDS || window.DEFAULT_DICTIONARY_WORDS || [];
    state.commonWordsSet = window.COMMON_WORDS_SET || new Set();

    state.trie = new window.Trie();
    state.dictionaryWords.forEach(word => state.trie.insert(word));
    state.isDictionaryLoaded = true;

    // Index dictionary for fast candidate lookup
    if (window.SuggestionEngine && window.SuggestionEngine.indexDictionary) {
        window.SuggestionEngine.indexDictionary(state.dictionaryWords);
    }

    if (statusEl) {
        statusEl.innerHTML = `<span class="badge badge-success">✓ Full Dictionary Loaded: ${state.trie.wordCount.toLocaleString()} words</span>`;
    }
}

/**
 * Tab Navigation Setup
 */
function setupNavigation() {
    const navItems = document.querySelectorAll(".nav-tab-btn");
    navItems.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetSection = btn.dataset.target;
            switchTab(targetSection);
        });
    });
}

function switchTab(sectionId) {
    state.currentTab = sectionId;

    // Update buttons
    document.querySelectorAll(".nav-tab-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.target === sectionId);
    });

    // Update sections
    document.querySelectorAll(".topic-section").forEach(sec => {
        sec.classList.toggle("active", sec.id === sectionId);
    });

    // Auto-trigger tab specific action
    if (sectionId === "comparison") {
        renderComparisonTable();
    } else if (sectionId === "maxflow") {
        runMaxFlow();
    } else if (sectionId === "kmp") {
        runKmp();
    } else if (sectionId === "ahocorasick") {
        runAhoCorasick();
    }
}

/**
 * Event Listeners for Buttons, Inputs, Presets
 */
function setupEventListeners() {
    // Spell check + KMP + AC all share the same text input; re-run whichever tab is active
    const spellInput = document.getElementById("spell-text-input");
    if (spellInput) {
        spellInput.addEventListener("input", debounce(() => {
            if (state.currentTab === "spellcheck") runSpellCheck();
            else if (state.currentTab === "kmp") runKmp();
            else if (state.currentTab === "ahocorasick") runAhoCorasick();
        }, 300));
    }

    // Presets — run spell check immediately, and trigger KMP/AC if those tabs are open
    document.querySelectorAll(".preset-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const text = btn.dataset.text;
            if (spellInput) {
                spellInput.value = text;
                runSpellCheck();
                // Also refresh KMP/AC if visible
                if (state.currentTab === "kmp") runKmp();
                if (state.currentTab === "ahocorasick") runAhoCorasick();
            }
        });
    });

    // Apply all fixes
    const applyAllBtn = document.getElementById("apply-all-fixes-btn");
    if (applyAllBtn) {
        applyAllBtn.addEventListener("click", applyAllTopCorrections);
    }

    // Max Flow algorithm toggle (Edmonds-Karp vs Dinic)
    const ekTabBtn = document.getElementById("ek-tab-btn");
    const dinicTabBtn = document.getElementById("dinic-tab-btn");
    if (ekTabBtn) {
        ekTabBtn.addEventListener("click", () => {
            ekTabBtn.classList.add("active");
            if (dinicTabBtn) dinicTabBtn.classList.remove("active");
            document.getElementById("ek-view").classList.remove("hidden");
            document.getElementById("dinic-view").classList.add("hidden");
        });
    }
    if (dinicTabBtn) {
        dinicTabBtn.addEventListener("click", () => {
            dinicTabBtn.classList.add("active");
            if (ekTabBtn) ekTabBtn.classList.remove("active");
            document.getElementById("dinic-view").classList.remove("hidden");
            document.getElementById("ek-view").classList.add("hidden");
        });
    }

    // Run benchmark button
    const benchmarkBtn = document.getElementById("run-benchmark-btn");
    if (benchmarkBtn) benchmarkBtn.addEventListener("click", runBenchmark);
}

/**
 * ----------------------------------------------------------------------------
 * 1. SPELL CHECKER LOGIC (Trie + Edit Distance Top 3 Suggestions)
 * ----------------------------------------------------------------------------
 */
function runSpellCheck() {
    const inputEl = document.getElementById("spell-text-input");
    if (!inputEl || !state.isDictionaryLoaded) return;

    const rawText = inputEl.value;
    if (!rawText.trim()) {
        renderSpellCheckEmpty();
        return;
    }

    const t0 = performance.now();

    // Tokenize text into words preserving positions
    // Regex splits by word boundaries
    const tokenRegex = /[a-zA-Z0-9']+/g;
    let match;
    const tokens = [];

    while ((match = tokenRegex.exec(rawText)) !== null) {
        tokens.push({
            raw: match[0],
            clean: match[0].toLowerCase().replace(/[^a-z]/g, ''),
            index: match.index,
            length: match[0].length
        });
    }

    const errors = [];
    let validCount = 0;

    tokens.forEach((token, idx) => {
        // Numbers or very short single letters (like 'a', 'i') are handled
        if (!token.clean || token.clean.length === 0) return;

        const isWord = state.trie.contains(token.clean);
        if (isWord) {
            validCount++;
        } else {
            // Error detected by Trie!
            // Retrieve TOP 3 Suggestions using SuggestionEngine
            const top3 = window.SuggestionEngine.getTopSuggestions(
                token.clean,
                state.dictionaryWords,
                state.commonWordsSet,
                2
            );

            errors.push({
                tokenIndex: idx + 1,
                rawWord: token.raw,
                cleanWord: token.clean,
                charIndex: token.index,
                topSuggestions: top3
            });
        }
    });

    const elapsedMs = (performance.now() - t0).toFixed(2);

    renderSpellCheckResults({
        totalTokens: tokens.length,
        errorsFound: errors.length,
        accuracy: tokens.length > 0 ? (((tokens.length - errors.length) / tokens.length) * 100).toFixed(1) : 100,
        elapsedMs: elapsedMs,
        errors: errors,
        rawText: rawText
    });
}

function renderSpellCheckResults(data) {
    // Stats Bar
    const statsEl = document.getElementById("spell-stats-bar");
    if (statsEl) {
        statsEl.innerHTML = `
            <div class="stat-card">
                <span class="stat-label">Total Words</span>
                <span class="stat-value">${data.totalTokens}</span>
            </div>
            <div class="stat-card ${data.errorsFound > 0 ? 'stat-error' : 'stat-success'}">
                <span class="stat-label">Errors Detected</span>
                <span class="stat-value">${data.errorsFound}</span>
            </div>
            <div class="stat-card">
                <span class="stat-label">Text Accuracy</span>
                <span class="stat-value">${data.accuracy}%</span>
            </div>
            <div class="stat-card">
                <span class="stat-label">Trie + DP Time</span>
                <span class="stat-value">${data.elapsedMs} ms</span>
            </div>
        `;
    }

    // Highlighted Text Preview
    const previewEl = document.getElementById("highlighted-text-preview");
    if (previewEl) {
        let html = "";
        let lastIdx = 0;
        data.errors.forEach(err => {
            html += escapeHtml(data.rawText.substring(lastIdx, err.charIndex));
            html += `<span class="error-highlight" title="Misspelled word">${escapeHtml(err.rawWord)}</span>`;
            lastIdx = err.charIndex + err.rawWord.length;
        });
        html += escapeHtml(data.rawText.substring(lastIdx));
        previewEl.innerHTML = html;
    }

    // Top 3 Suggestions Cards List
    const suggestionsContainer = document.getElementById("top-suggestions-container");
    if (!suggestionsContainer) return;

    if (data.errors.length === 0) {
        suggestionsContainer.innerHTML = `
            <div class="empty-state success">
                <div class="icon">✨</div>
                <h4>No Spelling Errors Detected!</h4>
                <p>All words were successfully verified against the Trie dictionary.</p>
            </div>
        `;
        return;
    }

    let cardsHtml = "";
    data.errors.forEach((err, i) => {
        cardsHtml += `
            <div class="suggestion-card">
                <div class="suggestion-card-header">
                    <span class="error-badge">Error #${i + 1}</span>
                    <span class="error-word-title">"${escapeHtml(err.rawWord)}"</span>
                    <span class="error-index-tag">Index: ${err.charIndex}</span>
                </div>
                <div class="top-3-grid">
                    ${err.topSuggestions.length > 0 ? err.topSuggestions.map((sugg, rank) => `
                        <div class="suggestion-pill rank-${rank + 1}" onclick="replaceSingleWord('${escapeHtml(err.rawWord)}', '${escapeHtml(sugg.word)}')">
                            <div class="pill-top">
                                <span class="rank-badge">#${rank + 1}</span>
                                <strong class="sugg-word">${escapeHtml(sugg.word)}</strong>
                                <span class="dist-badge">dist: ${sugg.distance}</span>
                            </div>
                            <div class="pill-meta">
                                ${sugg.soundexMatch ? '<span class="tag soundex-tag">Soundex Match</span>' : ''}
                                ${sugg.isCommon ? '<span class="tag common-tag">Common Word</span>' : ''}
                            </div>
                            <div class="pill-action">Click to Replace ↵</div>
                        </div>
                    `).join("") : `<div class="no-sugg-alert">No dictionary words within edit distance ≤ 2.</div>`}
                </div>
            </div>
        `;
    });

    suggestionsContainer.innerHTML = cardsHtml;
}

function renderSpellCheckEmpty() {
    const statsEl = document.getElementById("spell-stats-bar");
    if (statsEl) statsEl.innerHTML = "";
    const previewEl = document.getElementById("highlighted-text-preview");
    if (previewEl) previewEl.innerHTML = "<em>Type or select a sample sentence above to see spell check in action...</em>";
    const container = document.getElementById("top-suggestions-container");
    if (container) container.innerHTML = "";
}

/**
 * Replaces a single occurrence of an error in the text input.
 */
window.replaceSingleWord = function(oldWord, newWord) {
    const inputEl = document.getElementById("spell-text-input");
    if (!inputEl) return;
    const regex = new RegExp(`\\b${escapeRegExp(oldWord)}\\b`, 'i');
    inputEl.value = inputEl.value.replace(regex, newWord);
    runSpellCheck();
    if (state.currentTab === "kmp") runKmp();
    else if (state.currentTab === "ahocorasick") runAhoCorasick();
    else if (state.currentTab === "maxflow") runMaxFlow();
};

/**
 * Applies all top-1 suggestions across the entire text in one click.
 */
function applyAllTopCorrections() {
    const inputEl = document.getElementById("spell-text-input");
    if (!inputEl) return;

    let text = inputEl.value;
    const tokenRegex = /[a-zA-Z0-9']+/g;
    let match;
    const replacements = [];

    while ((match = tokenRegex.exec(text)) !== null) {
        const clean = match[0].toLowerCase().replace(/[^a-z]/g, '');
        if (clean && !state.trie.contains(clean)) {
            const top3 = window.SuggestionEngine.getTopSuggestions(clean, state.dictionaryWords, state.commonWordsSet, 2);
            if (top3.length > 0) {
                replacements.push({
                    raw: match[0],
                    replacement: top3[0].word
                });
            }
        }
    }

    replacements.forEach(rep => {
        const regex = new RegExp(`\\b${escapeRegExp(rep.raw)}\\b`, 'i');
        text = text.replace(regex, rep.replacement);
    });

    inputEl.value = text;
    runSpellCheck();
    if (state.currentTab === "kmp") runKmp();
    else if (state.currentTab === "ahocorasick") runAhoCorasick();
    else if (state.currentTab === "maxflow") runMaxFlow();
}

/**
 * ----------------------------------------------------------------------------
 * 2. KMP — AUTO-DETECT ALL ERRORS, THEN LOCATE EACH WITH KMP
 * ----------------------------------------------------------------------------
 * Step 1: Tokenize text & run Trie lookup to find all misspelled words (same as Spell Checker).
 * Step 2: For EACH detected error word, run KMP to find its exact character indices,
 *         line/column, surrounding context, and Top 3 suggestions.
 * Step 3: Build and display LPS table for each unique error pattern.
 */
function runKmp() {
    const textEl = document.getElementById("spell-text-input");
    if (!textEl || !state.isDictionaryLoaded) return;

    const text = textEl.value;
    if (!text.trim()) {
        document.getElementById("kmp-results-container").innerHTML =
            `<div class="empty-state"><p>Type or select a preset sentence in the text box above.</p></div>`;
        document.getElementById("kmp-lps-container").innerHTML = "";
        return;
    }

    // --- Step 1: Detect all error words via Trie (same logic as spell checker) ---
    const tokenRegex = /[a-zA-Z]+/g;
    let m;
    const errorWords = new Set(); // unique misspelled words only (to avoid re-running KMP on duplicates)

    while ((m = tokenRegex.exec(text)) !== null) {
        const clean = m[0].toLowerCase();
        if (clean.length > 1 && !state.trie.contains(clean)) {
            errorWords.add(clean);
        }
    }

    const infoEl = document.getElementById("kmp-run-info");
    if (infoEl) infoEl.textContent = `${errorWords.size} unique error${errorWords.size !== 1 ? 's' : ''} detected`;

    if (errorWords.size === 0) {
        document.getElementById("kmp-results-container").innerHTML =
            `<div class="empty-state success"><h4>No Spelling Errors Detected</h4><p>All words verified in dictionary — nothing to search with KMP.</p></div>`;
        document.getElementById("kmp-lps-container").innerHTML = "";
        return;
    }

    // --- Step 2: For each error word, run KMP to find ALL its character index occurrences ---
    const t0 = performance.now();
    const allResults = []; // { pattern, occurrences: [], lps: [] }

    for (const errorWord of errorWords) {
        const { lps } = window.KMP.buildLPSTable(errorWord);
        const occurrences = window.KMP.searchWithContext(
            text, errorWord, state.trie, state.dictionaryWords, state.commonWordsSet
        );
        allResults.push({ pattern: errorWord, lps, occurrences });
    }

    const elapsedMs = (performance.now() - t0).toFixed(3);

    // --- Step 3: Render results + LPS tables ---
    renderKmpAutoResults(allResults, elapsedMs, text);
    renderKmpLpsTables(allResults);
}

/**
 * Renders all auto-detected KMP results (one block per unique error word).
 */
function renderKmpAutoResults(allResults, elapsedMs, fullText) {
    const container = document.getElementById("kmp-results-container");
    if (!container) return;

    const totalOccurrences = allResults.reduce((sum, r) => sum + r.occurrences.length, 0);
    let html = `
        <div class="kmp-summary-bar">
            <span class="badge badge-error">Unique Error Words: ${allResults.length}</span>
            <span class="badge badge-primary">Total Occurrences Located: ${totalOccurrences}</span>
            <span class="badge badge-info">KMP Time: ${elapsedMs} ms — O(n + m) per pattern, zero backtracking</span>
        </div>
        <div class="kmp-matches-list">
    `;

    allResults.forEach((item) => {
        item.occurrences.forEach((res, idx) => {
            html += `
                <div class="kmp-match-card is-error">
                    <div class="kmp-card-header">
                        <span class="error-badge">Error Word</span>
                        <span class="error-word-title">"${escapeHtml(item.pattern)}"</span>
                        <span class="match-num">Occurrence #${idx + 1}</span>
                        <span class="match-coords">
                            Range: <code>[${res.startIndex} … ${res.endIndex}]</code> &nbsp;|&nbsp;
                            Line ${res.lineNumber}, Col ${res.columnNumber} &nbsp;|&nbsp;
                            Word #${res.wordIndex}
                        </span>
                        <span class="status-tag error">Error</span>
                    </div>

                    <div class="context-snippet">
                        <span class="snippet-prefix">${escapeHtml(res.context.prefix)}</span>
                        <mark class="snippet-matched">${escapeHtml(res.context.match)}</mark>
                        <span class="snippet-suffix">${escapeHtml(res.context.suffix)}</span>
                    </div>

                    ${res.topSuggestions && res.topSuggestions.length > 0 ? `
                        <div class="kmp-correction-box">
                            <span class="box-title">Top 3 Suggestions:</span>
                            <div class="kmp-sugg-pills">
                                ${res.topSuggestions.map((s, r) => `
                                    <button class="kmp-fix-pill" onclick="replaceSingleWord('${escapeHtml(item.pattern)}', '${escapeHtml(s.word)}')">
                                        #${r + 1} &nbsp;<strong>${escapeHtml(s.word)}</strong>&nbsp; (dist: ${s.distance})
                                    </button>
                                `).join("")}
                            </div>
                        </div>
                    ` : ""}
                </div>
            `;
        });
    });

    html += `</div>`;
    container.innerHTML = html;
}

/**
 * Renders one LPS table per unique error word (collapsed into a scrollable section).
 */
function renderKmpLpsTables(allResults) {
    const container = document.getElementById("kmp-lps-container");
    if (!container) return;

    let html = "";
    allResults.forEach(item => {
        const pattern = item.pattern;
        const lps = item.lps;
        html += `
            <div class="lps-display-wrapper" style="margin-bottom: 16px;">
                <h4>LPS Table for error pattern: <code style="color:#38bdf8">"${escapeHtml(pattern)}"</code></h4>
                <p class="lps-description">
                    Built in <code>O(m) = O(${pattern.length})</code> steps.
                    On mismatch at index j, KMP uses <code>lps[j-1]</code> to skip characters
                    instead of resetting — guaranteeing zero text-index retreat.
                </p>
                <div class="lps-table-scroll">
                    <table class="lps-table">
                        <thead>
                            <tr>
                                <th>Index (i)</th>
                                ${pattern.split("").map((_, idx) => `<th>${idx}</th>`).join("")}
                            </tr>
                        </thead>
                        <tbody>
                            <tr class="char-row">
                                <td><strong>Pattern[i]</strong></td>
                                ${pattern.split("").map(c => `<td><strong>${escapeHtml(c)}</strong></td>`).join("")}
                            </tr>
                            <tr class="lps-val-row">
                                <td><strong>LPS[i]</strong></td>
                                ${lps.map(v => `<td class="${v > 0 ? 'highlight-lps' : ''}">${v}</td>`).join("")}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function renderKmpLps(pattern, lps, steps) {
    const container = document.getElementById("kmp-lps-container");
    if (!container) return;

    let html = `
        <div class="lps-display-wrapper">
            <h4>KMP Precomputed LPS (Longest Prefix-Suffix) Table</h4>
            <p class="lps-description">Time to build: <code>O(m) = O(${pattern.length})</code>. Tells KMP how many characters can be safely skipped after a mismatch without moving the text index backwards!</p>
            <div class="lps-table-scroll">
                <table class="lps-table">
                    <thead>
                        <tr>
                            <th>Index (i)</th>
                            ${pattern.split("").map((_, idx) => `<th>${idx}</th>`).join("")}
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="char-row">
                            <td><strong>Pattern[i]</strong></td>
                            ${pattern.split("").map(c => `<td><strong>${escapeHtml(c)}</strong></td>`).join("")}
                        </tr>
                        <tr class="lps-val-row">
                            <td><strong>LPS[i]</strong></td>
                            ${lps.map(v => `<td class="${v > 0 ? 'highlight-lps' : ''}">${v}</td>`).join("")}
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

function renderKmpResults(pattern, results, elapsedMs, fullText) {
    const container = document.getElementById("kmp-results-container");
    if (!container) return;

    if (results.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">🔍</div>
                <h4>Pattern "${escapeHtml(pattern)}" Not Found</h4>
                <p>KMP scanned the entire text of ${fullText.length} characters in ${elapsedMs} ms with zero backtracking.</p>
            </div>
        `;
        return;
    }

    let html = `
        <div class="kmp-summary-bar">
            <span class="badge badge-primary">Matches Found: ${results.length}</span>
            <span class="badge badge-info">Search Time: ${elapsedMs} ms (O(n + m))</span>
            <span class="badge ${results[0].isError ? 'badge-error' : 'badge-success'}">
                Dictionary Status: ${results[0].isError ? 'MISSING (Flagged as Error)' : 'VALID WORD'}
            </span>
        </div>
        <div class="kmp-matches-list">
    `;

    results.forEach((res, idx) => {
        html += `
            <div class="kmp-match-card ${res.isError ? 'is-error' : 'is-valid'}">
                <div class="kmp-card-header">
                    <span class="match-num">Occurrence #${idx + 1}</span>
                    <span class="match-coords">
                        Character Range: <code>[${res.startIndex} ... ${res.endIndex}]</code> | 
                        Line ${res.lineNumber}, Column ${res.columnNumber} | 
                        Word #${res.wordIndex}
                    </span>
                    ${res.isError ? '<span class="status-tag error">Detected Error</span>' : '<span class="status-tag valid">Valid Word</span>'}
                </div>

                <div class="context-snippet">
                    <span class="snippet-prefix">${escapeHtml(res.context.prefix)}</span>
                    <mark class="snippet-matched">${escapeHtml(res.context.match)}</mark>
                    <span class="snippet-suffix">${escapeHtml(res.context.suffix)}</span>
                </div>

                ${res.isError && res.topSuggestions.length > 0 ? `
                    <div class="kmp-correction-box">
                        <span class="box-title">Top 3 Suggested Replacements:</span>
                        <div class="kmp-sugg-pills">
                            ${res.topSuggestions.map((s, r) => `
                                <button class="kmp-fix-pill" onclick="replaceSingleWord('${escapeHtml(pattern)}', '${escapeHtml(s.word)}')">
                                    #${r + 1} Replace with "<strong>${escapeHtml(s.word)}</strong>" (dist: ${s.distance})
                                </button>
                            `).join("")}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    });

    html += `</div>`;
    container.innerHTML = html;
}

/**
 * ----------------------------------------------------------------------------
 * 3. AHO-CORASICK — AUTO-DETECT ALL ERRORS, THEN SCAN TEXT SIMULTANEOUSLY
 * ----------------------------------------------------------------------------
 * Step 1: Detects all misspelled words via Trie lookup (same spell check method).
 * Step 2: Feeds all detected error words into the Aho-Corasick automaton.
 * Step 3: Scans the entire text in a single pass of O(n + z) time.
 * Step 4: Displays all error occurrences with exact indices and top-3 suggestions.
 */
function runAhoCorasick() {
    const textEl = document.getElementById("spell-text-input");
    if (!textEl || !state.isDictionaryLoaded) return;

    const text = textEl.value;
    if (!text.trim()) {
        document.getElementById("ac-results-container").innerHTML = `
            <div class="empty-state">
                <p>Type or select a preset sentence in the text box above.</p>
            </div>
        `;
        return;
    }

    // Step 1: Auto-detect all misspelled words via Trie
    const tokenRegex = /[a-zA-Z]+/g;
    let m;
    const errorWords = new Set();

    while ((m = tokenRegex.exec(text)) !== null) {
        const clean = m[0].toLowerCase();
        if (clean.length > 1 && !state.trie.contains(clean)) {
            errorWords.add(clean);
        }
    }

    const errorPatterns = Array.from(errorWords);
    const infoEl = document.getElementById("ac-run-info");
    if (infoEl) infoEl.textContent = `${errorPatterns.length} error pattern${errorPatterns.length !== 1 ? 's' : ''} auto-loaded`;

    if (errorPatterns.length === 0) {
        document.getElementById("ac-results-container").innerHTML = `
            <div class="empty-state success">
                <h4>No Spelling Errors Detected</h4>
                <p>All words verified in dictionary — no error patterns to match with Aho-Corasick.</p>
            </div>
        `;
        return;
    }

    // Step 2 & 3: Build Aho-Corasick Automaton & Search simultaneously in O(n + z)
    const t0 = performance.now();
    const ac = new window.AhoCorasick(errorPatterns);
    const rawMatches = ac.search(text);
    const elapsedMs = (performance.now() - t0).toFixed(3);

    // Compute line and column numbers for each match
    const enrichedMatches = rawMatches.map(match => {
        const textUpToMatch = text.substring(0, match.startIndex);
        const lines = textUpToMatch.split("\n");
        const lineNumber = lines.length;
        const columnNumber = lines[lines.length - 1].length + 1;

        const top3 = window.SuggestionEngine.getTopSuggestions(
            match.pattern,
            state.dictionaryWords,
            state.commonWordsSet,
            2
        );

        return {
            ...match,
            lineNumber: lineNumber,
            columnNumber: columnNumber,
            topSuggestions: top3
        };
    });

    renderAhoCorasickResults(errorPatterns, enrichedMatches, elapsedMs, text);
}

function renderAhoCorasickResults(patterns, matches, elapsedMs, text) {
    const container = document.getElementById("ac-results-container");
    if (!container) return;

    let html = `
        <div class="ac-summary-bar">
            <span class="badge badge-error">Auto-Detected Error Patterns: ${patterns.length}</span>
            <span class="badge badge-primary">Total Match Hits: ${matches.length}</span>
            <span class="badge badge-info">Single-Pass Scan Time: ${elapsedMs} ms (O(n + z))</span>
        </div>
        <div class="ac-hits-table-wrapper">
            <table class="ac-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Detected Error</th>
                        <th>Index Range</th>
                        <th>Line, Col</th>
                        <th>Matched Text</th>
                        <th>Top Suggestions (1-Click Fix)</th>
                    </tr>
                </thead>
                <tbody>
                    ${matches.length > 0 ? matches.map((m, i) => `
                        <tr>
                            <td>${i + 1}</td>
                            <td><strong style="color: #f87171;">"${escapeHtml(m.pattern)}"</strong></td>
                            <td><code>[${m.startIndex} … ${m.endIndex}]</code></td>
                            <td>Line ${m.lineNumber}, Col ${m.columnNumber}</td>
                            <td><mark class="snippet-matched">${escapeHtml(text.substring(m.startIndex, m.endIndex + 1))}</mark></td>
                            <td>
                                <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                                    ${m.topSuggestions && m.topSuggestions.length > 0 ? m.topSuggestions.map((s, r) => `
                                        <button class="kmp-fix-pill" onclick="replaceSingleWord('${escapeHtml(m.pattern)}', '${escapeHtml(s.word)}')">
                                            #${r + 1} ${escapeHtml(s.word)} (${s.distance})
                                        </button>
                                    `).join("") : '<span style="color: var(--text-muted); font-size: 11px;">No close candidates</span>'}
                                </div>
                            </td>
                        </tr>
                    `).join("") : `<tr><td colspan="6" class="text-center">No pattern hits found.</td></tr>`}
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = html;
}

/**
 * ----------------------------------------------------------------------------
 * 4. MAX FLOW FOR SUGGESTIONS (Edmonds-Karp & Dinic's Algorithm)
 * ----------------------------------------------------------------------------
 */
function runMaxFlow() {
    const inputEl = document.getElementById("spell-text-input");
    if (!inputEl || !state.isDictionaryLoaded) return;

    const rawText = inputEl.value;
    const tokenRegex = /[a-zA-Z0-9']+/g;
    let match;
    const errors = [];

    while ((match = tokenRegex.exec(rawText)) !== null) {
        const clean = match[0].toLowerCase().replace(/[^a-z]/g, '');
        if (clean && clean.length > 1 && !state.trie.contains(clean)) {
            // Found an error
            const top3 = window.SuggestionEngine.getTopSuggestions(clean, state.dictionaryWords, state.commonWordsSet, 2);
            if (top3.length > 0) {
                errors.push({
                    word: clean,
                    raw: match[0],
                    suggestions: top3
                });
            }
        }
    }

    if (errors.length === 0) {
        renderMaxFlowEmpty();
        return;
    }

    // Build the Bipartite Matching Flow Network:
    // Source -> Errors -> Candidate Suggestions -> Sink
    const netData = window.MaxFlowEngine.buildSuggestionNetwork(errors);
    state.lastFlowData = netData;

    // Run Edmonds-Karp with detailed path tracing
    const ekResult = window.MaxFlowEngine.runEdmondsKarp(netData.network, netData.source, netData.sink);

    // Run Dinic's with detailed Level Graph & Blocking Flow tracing
    const dinicResult = window.MaxFlowEngine.runDinics(netData.network, netData.source, netData.sink);

    // Render interactive visual flow graph & detailed path steps
    renderMaxFlowGraph(netData, ekResult, dinicResult);
    renderEdmondsKarpDetailedPaths(ekResult);
    renderDinicsDetailedPhases(dinicResult);
}

function renderMaxFlowEmpty() {
    const container = document.getElementById("flow-graph-container");
    if (container) {
        container.innerHTML = `
            <div class="empty-state">
                <h4>No Errors to Match</h4>
                <p>The current text contains no detected misspellings to construct a suggestion bipartite network. Select a preset with errors above (e.g. Preset 1)!</p>
            </div>
        `;
    }
}

function renderMaxFlowGraph(netData, ekResult, dinicResult) {
    const container = document.getElementById("flow-graph-container");
    if (!container) return;

    // Create a visual bipartite SVG flow diagram
    const width = 800;
    const height = Math.max(340, Math.max(netData.errorNodes.length, netData.suggestionNodes.length) * 60 + 80);

    const sourceX = 80;
    const sourceY = height / 2;

    const errorX = 280;
    const suggX = 520;

    const sinkX = 720;
    const sinkY = height / 2;

    // Compute Y positions
    const errorYStep = height / (netData.errorNodes.length + 1);
    const suggYStep = height / (netData.suggestionNodes.length + 1);

    const nodeCoords = new Map();
    nodeCoords.set(netData.source, { x: sourceX, y: sourceY, label: "SOURCE (S)", type: "source" });
    nodeCoords.set(netData.sink, { x: sinkX, y: sinkY, label: "SINK (T)", type: "sink" });

    netData.errorNodes.forEach((node, i) => {
        nodeCoords.set(node, { x: errorX, y: errorYStep * (i + 1), label: node, type: "error" });
    });

    netData.suggestionNodes.forEach((node, i) => {
        nodeCoords.set(node, { x: suggX, y: suggYStep * (i + 1), label: node, type: "sugg" });
    });

    let svgHtml = `
        <svg viewBox="0 0 ${width} ${height}" class="flow-svg">
            <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
                </marker>
                <marker id="arrow-active" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
                </marker>
            </defs>
    `;

    // Draw Edges
    for (const [fromNode, edges] of ekResult.network.adjacencyList.entries()) {
        const fromCoord = nodeCoords.get(fromNode);
        if (!fromCoord) continue;

        edges.forEach(edge => {
            if (edge.capacity > 0) { // Forward edge
                const toCoord = nodeCoords.get(edge.to);
                if (!toCoord) return;

                const isSaturated = edge.flow > 0;
                const strokeColor = isSaturated ? "#10b981" : "#334155";
                const strokeWidth = isSaturated ? "3" : "1.5";
                const marker = isSaturated ? "url(#arrow-active)" : "url(#arrow)";

                svgHtml += `
                    <line x1="${fromCoord.x}" y1="${fromCoord.y}" x2="${toCoord.x}" y2="${toCoord.y}" 
                          stroke="${strokeColor}" stroke-width="${strokeWidth}" marker-end="${marker}" />
                    <text x="${(fromCoord.x + toCoord.x) / 2}" y="${(fromCoord.y + toCoord.y) / 2 - 6}" 
                          fill="${isSaturated ? '#34d399' : '#64748b'}" font-size="10" font-weight="600" text-anchor="middle">
                        ${edge.flow}/${edge.capacity}
                    </text>
                `;
            }
        });
    }

    // Draw Nodes
    for (const [node, coord] of nodeCoords.entries()) {
        let nodeFill = "#3b82f6"; // source/sink blue
        if (coord.type === "error") nodeFill = "#ef4444"; // error red
        if (coord.type === "sugg") nodeFill = "#10b981"; // suggestion emerald

        svgHtml += `
            <g class="flow-node">
                <circle cx="${coord.x}" cy="${coord.y}" r="18" fill="${nodeFill}" stroke="#0f172a" stroke-width="3" />
                <text x="${coord.x}" y="${coord.y + 32}" fill="#e2e8f0" font-size="11" font-weight="600" text-anchor="middle">
                    ${escapeHtml(coord.label.replace('Error[', 'E[').replace('Sugg: ', ''))}
                </text>
            </g>
        `;
    }

    svgHtml += `</svg>`;

    container.innerHTML = `
        <div class="flow-vis-card">
            <div class="flow-vis-header">
                <h4>Interactive Bipartite Matching Flow Graph</h4>
                <div class="flow-legend">
                    <span class="legend-item"><span class="dot source-dot"></span> Source / Sink</span>
                    <span class="legend-item"><span class="dot error-dot"></span> Error Nodes</span>
                    <span class="legend-item"><span class="dot sugg-dot"></span> Suggestion Pool</span>
                    <span class="legend-item"><span class="line-sample active"></span> Active Saturated Flow (1/1)</span>
                </div>
            </div>
            <div class="svg-wrapper">${svgHtml}</div>
            <div class="flow-solution-box">
                <strong>Optimal Max Flow Assignment (${ekResult.maxFlow} matched errors):</strong>
                <div class="assignment-tags">
                    ${ekResult.assignments.map(a => `
                        <span class="assign-pill">
                            <strong>${escapeHtml(a.errorNode)}</strong> ➜ <span class="chosen-sugg">${escapeHtml(a.suggestionNode)}</span>
                        </span>
                    `).join("")}
                </div>
            </div>
        </div>
    `;
}

function renderEdmondsKarpDetailedPaths(ekResult) {
    const container = document.getElementById("ek-paths-container");
    if (!container) return;

    let html = `
        <div class="ek-overview">
            <div class="algorithm-badge-row">
                <span class="badge badge-primary">Edmonds-Karp Algorithm</span>
                <span class="badge badge-info">Complexity: O(V · E²)</span>
                <span class="badge badge-success">Max Flow: ${ekResult.maxFlow}</span>
                <span class="badge badge-secondary">Augmenting Paths Found: ${ekResult.pathHistory.length}</span>
            </div>
            <p class="algo-explanation-p">
                <strong>How Edmonds-Karp Works:</strong> Uses Breadth-First Search (BFS) on the residual network to find the shortest augmenting path (fewest edges) from Source to Sink. It pushes the bottleneck capacity along that path, updates residual forward/backward capacities, and repeats until Sink is unreachable.
            </p>
        </div>
        <div class="path-timeline">
    `;

    ekResult.pathHistory.forEach((step, idx) => {
        html += `
            <div class="path-step-card">
                <div class="step-badge">Path Step #${step.iteration}</div>
                <div class="path-route">
                    <code class="path-code">${escapeHtml(step.pathString)}</code>
                </div>
                <div class="step-metrics">
                    <span class="metric-tag">Bottleneck Capacity: <strong>${step.bottleneckCapacity}</strong></span>
                    <span class="metric-tag">Cumulative Flow: <strong>${step.cumulativeFlow}</strong></span>
                </div>
                <p class="step-explanation">${escapeHtml(step.explanation)}</p>
            </div>
        `;
    });

    html += `
        <div class="path-step-card termination-card">
            <div class="step-badge term">Termination</div>
            <p><strong>BFS from Source could not reach Sink (Visited set did not contain Sink).</strong> By the Max-Flow Min-Cut Theorem, the maximum flow of <strong>${ekResult.maxFlow}</strong> is optimal!</p>
        </div>
    </div>`;

    container.innerHTML = html;
}

function renderDinicsDetailedPhases(dinicResult) {
    const container = document.getElementById("dinic-phases-container");
    if (!container) return;

    let html = `
        <div class="dinic-overview">
            <div class="algorithm-badge-row">
                <span class="badge badge-primary">Dinic's Algorithm</span>
                <span class="badge badge-info">Complexity: O(E · √V) on Bipartite Networks</span>
                <span class="badge badge-success">Max Flow: ${dinicResult.maxFlow}</span>
                <span class="badge badge-secondary">Total Phases: ${dinicResult.phases.length}</span>
            </div>
            <p class="algo-explanation-p">
                <strong>How Dinic's Works:</strong> Operates in phases. In each phase, a <strong>Level Graph</strong> is constructed via BFS (assigning distance from Source). Then, multiple <strong>Blocking Flows</strong> are pushed simultaneously using DFS along admissible edges (where <code>level[v] = level[u] + 1</code>). This dramatically reduces the number of graph passes compared to Edmonds-Karp!
            </p>
        </div>
        <div class="phases-timeline">
    `;

    dinicResult.phases.forEach((phase, idx) => {
        html += `
            <div class="phase-card">
                <div class="phase-header">
                    <h4>Phase #${phase.phase}</h4>
                    <span class="phase-flow-tag">Flow Pushed This Phase: +${phase.phaseFlow} (Cumulative: ${phase.cumulativeFlow})</span>
                </div>
                
                <div class="level-layers-box">
                    <strong>1. BFS Level Graph (Layers):</strong>
                    <div class="layers-grid">
                        ${Object.keys(phase.levelGraphLayers).map(lvl => `
                            <div class="layer-column">
                                <span class="layer-title">Level ${lvl}</span>
                                <div class="layer-nodes">
                                    ${phase.levelGraphLayers[lvl].map(n => `
                                        <span class="node-tag">${escapeHtml(n.replace('Error[', 'E[').replace('Sugg: ', ''))}</span>
                                    `).join("")}
                                </div>
                            </div>
                        `).join("")}
                    </div>
                </div>

                <div class="blocking-flow-box">
                    <strong>2. DFS Blocking Flows Pushed:</strong>
                    <div class="blocking-paths-list">
                        ${phase.blockingPaths.map((bp, bidx) => `
                            <div class="blocking-path-item">
                                <span class="bp-num">Flow #${bidx + 1}:</span>
                                <code>${escapeHtml(bp.pathString)}</code>
                                <span class="bp-flow">Pushed: <strong>${bp.pushedFlow}</strong></span>
                            </div>
                        `).join("")}
                    </div>
                </div>
            </div>
        `;
    });

    html += `</div>`;
    container.innerHTML = html;
}

/**
 * ----------------------------------------------------------------------------
 * 5. ALGORITHM COMPARISON MATRIX & BENCHMARK
 * ----------------------------------------------------------------------------
 */
function renderComparisonTable() {
    const tableBody = document.getElementById("comparison-table-body");
    if (!tableBody) return;

    let html = "";
    window.ALGORITHM_COMPARISON_DATA.forEach(algo => {
        html += `
            <tr>
                <td class="algo-name-cell">
                    <strong>${escapeHtml(algo.name)}</strong>
                    <span class="sub-badge">${escapeHtml(algo.syllabusCO)}</span>
                </td>
                <td>
                    <div class="complexity-stack">
                        <div><strong>Build:</strong> ${escapeHtml(algo.timeComplexity.build)}</div>
                        <div><strong>Search:</strong> ${escapeHtml(algo.timeComplexity.lookup)}</div>
                    </div>
                </td>
                <td><code>${escapeHtml(algo.spaceComplexity)}</code></td>
                <td><p class="methodology-text">${escapeHtml(algo.methodology)}</p></td>
                <td><span class="output-text">${escapeHtml(algo.output)}</span></td>
                <td><span class="accuracy-tag">${escapeHtml(algo.accuracy)}</span></td>
                <td><span class="usecase-text">${escapeHtml(algo.bestUse)}</span></td>
            </tr>
        `;
    });

    tableBody.innerHTML = html;
}

function runBenchmark() {
    const textEl = document.getElementById("spell-text-input");
    const container = document.getElementById("benchmark-results-container");
    if (!textEl || !container || !state.isDictionaryLoaded) return;

    const text = textEl.value || "wat is yoe nama and I recieve a mesage";
    container.innerHTML = `<div class="loading-spinner">Running high-precision live micro-benchmarks...</div>`;

    setTimeout(() => {
        const metrics = window.BenchmarkSuite.runBenchmark(
            text,
            state.trie,
            state.dictionaryWords,
            state.commonWordsSet
        );

        let html = `
            <div class="benchmark-grid">
                ${metrics.map(m => `
                    <div class="benchmark-card">
                        <div class="bm-header">
                            <span class="bm-category">${escapeHtml(m.category)}</span>
                            <h4>${escapeHtml(m.name)}</h4>
                        </div>
                        <div class="bm-time">${m.timeMs.toFixed(3)} <span class="unit">ms</span></div>
                        <div class="bm-details">
                            <div><strong>Operations:</strong> ${escapeHtml(m.operations)}</div>
                            <div><strong>Results:</strong> ${escapeHtml(m.findings)}</div>
                            <div><strong>Complexity:</strong> <code>${escapeHtml(m.complexity)}</code></div>
                        </div>
                    </div>
                `).join("")}
            </div>
        `;

        container.innerHTML = html;
    }, 50);
}

/**
 * ----------------------------------------------------------------------------
 * UTILITY HELPERS
 * ----------------------------------------------------------------------------
 */
function debounce(fn, delay) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), delay);
    };
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
