# DSA String & Flow Algorithm Studio (Web Dashboard)

A modern, interactive, and beautifully designed web application for demonstrating **Dictionary-Based Error Detection, String Algorithms, and Network Flow**.

Built for your DSA project, presentations, and viva defenses.

---

## 🚀 How to Run from VS Code

You can run this website in **3 easy ways** inside VS Code:

### Option 1: VS Code "Live Server" Extension (Easiest)
1. Open this folder in VS Code:
   ```bash
   File > Open Folder... > /Users/7rainreddy7/Downloads/PROJECTS/DSA FRONTEND
   ```
2. Right-click on `index.html` in the file explorer.
3. Select **"Open with Live Server"**.
4. The website will open automatically in your browser with hot-reload enabled.

---

### Option 2: Run via Terminal Script / macOS Double-Click
- **From VS Code Terminal**:
  ```bash
  chmod +x run.command
  ./run.command
  ```
- **From macOS Finder**:
  Double-click `run.command`. It starts a lightweight local server and opens your browser immediately.

---

### Option 3: Direct Browser Open
Simply double-click `index.html` or run:
```bash
open index.html
```

---

## 📁 Project Architecture & File Breakdown

Every single JavaScript file is **heavily commented** with step-by-step logic, time/space complexity analysis, and direct viva answers:

```
DSA FRONTEND/
├── index.html                   # Main dashboard UI with topic navigation tabs
├── css/
│   └── style.css                # Dark academic glassmorphism theme, responsive layout
├── js/
│   ├── dictionary_data.js       # Complete pre-loaded 370,105-word lexicon (corpus/dictionary.txt)
│   ├── dictionary.js            # Lexicon initializer & common words frequency set (1,072 words)
│   ├── trie.js                  # O(L) Prefix Tree data structure (Insert, Search, StartsWith)
│   ├── suggestionEngine.js      # Damerau-Levenshtein Edit Distance (DP), Soundex & Top 3 Suggestions
│   ├── kmp.js                   # KMP with LPS Table, exact [start...end] indices & error locator
│   ├── ahoCorasick.js           # Multi-pattern Trie with BFS Failure & Output Links (O(n + z))
│   ├── maxFlow.js               # Dinic's & Edmonds-Karp with step-by-step path illustrations
│   ├── comparison.js            # Comprehensive Algorithm Comparison Matrix & Live Benchmark
│   └── app.js                   # UI controller, event bindings, and SVG bipartite visualizer
├── .vscode/
│   ├── launch.json              # VS Code Chrome/Browser debugger configurations
│   └── tasks.json               # VS Code build and launch tasks
├── run.command                  # One-click launcher for macOS
└── README.md                    # Project documentation & viva defense cheat-sheet
```

---

## Topic Sections & Capabilities

### 1. Spell Checker (Trie + Top-3 DP Suggestions)
* **Trie Lookup**: Verifies every word in \(O(L)\) time independent of dictionary size.
* **Top 3 Suggestions**: When an error is found, generates the top 3 best suggestions ranked by:
  1. Damerau-Levenshtein Edit Distance (\(\le 2\))
  2. Soundex Phonetic Match (e.g. `recieve` ➜ `receive` sharing phonetic code `R210`)
  3. Common-word bias (penalizing obscure words like `wat`, `yoe`, `nama`).
* **Interactive Fix**: Click any suggestion pill to replace it in the editor, or use **Auto-Apply All Top-1 Corrections**.

---

### 2. KMP Error & Index Locator (Automatic Error Detection)
* **Zero Manual Error Entry**: Automatically detects all misspellings in the document via Trie lookup.
* **Exact Index Range & Coordinates**:
  * Exact 0-based character ranges: `[start ... end]`
  * Line number, column number, and word position in the document.
  * Contextual preview window highlighting the error in surrounding sentence text.
  * Direct Top-3 suggested corrections with 1-click replacement!
* **Visual LPS Tables**: Generates and displays the precomputed Longest Prefix-Suffix table for every detected error pattern.

---

### 3. Aho-Corasick Multi-Pattern Error Scanner (Automatic Multi-Pattern Detection)
* **Zero Manual Error Entry**: Automatically loads all detected error words from the text into the Aho-Corasick automaton.
* **Single-Pass Scan**: Locates all occurrences of all error patterns simultaneously in a single pass of \(O(n + z)\).
* **Hit Table**: Displays exact index ranges `[start ... end]`, line/column coordinates, matched snippets, and 1-click suggestion replacements.

---

### 4. Max Flow Suggestion Engine (Edmonds-Karp & Dinic's Algorithm)
#### *Why Max Flow for Spell Check Suggestions?*
When multiple misspelled words exist in a single sentence, candidate suggestions can collide (e.g., both typos greedily wanting the word `relieve`). 
We model error correction as a **Maximum Bipartite Matching Network Flow**:
* **Source (\(S\))** connects to each **Error Token** with capacity 1.
* Each **Error Token** connects to candidate **Dictionary Suggestions** (edit distance \(\le 2\)) with capacity 1.
* Each **Dictionary Suggestion** connects to **Sink (\(T\))** with capacity 1.
* Max Flow finds the globally optimal assignment, eliminating collisions!

#### *Detailed Path Illustrations Included:*
* **Edmonds-Karp**:
  * Step-by-step path stepper showing each BFS augmenting path:
    `SOURCE (S) ➜ Error[i] ➜ Sugg[j] ➜ SINK (T)`
  * Exact bottleneck capacity and cumulative flow updates.
  * Residual graph edge adjustments.
* **Dinic's Algorithm**:
  * **BFS Level Graph**: Shows exact visual layers (Level 0: Source, Level 1: Errors, Level 2: Suggestions, Level 3: Sink).
  * **DFS Blocking Flows**: Shows every path pushed in each phase.
  * Runs in \(O(E \sqrt{V})\) on bipartite networks—significantly faster than Edmonds-Karp!
* **Interactive SVG Graph**: Visually draws the bipartite graph with colored nodes and animated saturated flow lines (`1/1`).

---

### 5. Algorithm Comparison Matrix & Live Micro-Benchmark
* **Theoretical Matrix**:
  Side-by-side comparison across:
  * Time Complexity (Build, Lookup, Worst Case)
  * Space Complexity
  * Methodology & Data Structures
  * Output Formats
  * Accuracy & Limitations
  * Best Real-World Use Cases
* **Live Micro-Benchmark**:
  Runs all algorithms live on your current text and records exact execution times down to microseconds (`ms`) with operation counts.
