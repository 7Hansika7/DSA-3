#!/bin/bash
# Change to the script's directory
cd "$(dirname "$0")"

echo "=================================================="
echo " Launching DSA Spell Check & Algorithm Studio..."
echo "=================================================="

# Check if python3 is available to host a local server, or open directly
if command -v python3 &>/dev/null; then
    echo "Starting local web server at http://localhost:8000"
    open "http://localhost:8000/index.html"
    python3 -m http.server 8000
else
    echo "Opening index.html directly in your default browser..."
    open index.html
fi
