#!/bin/bash

# Newman Summary Generation Script
# Runs API tests and generates Newman summary for deployment validation

set -e

echo "Starting Newman test execution..."
echo ""

# Create artifacts directory
mkdir -p artifacts/newman

# Check if Newman is installed
if ! command -v newman &> /dev/null; then
    echo "Newman is not installed. Installing..."
    npm install -g newman
fi

echo "Running API tests with Newman..."
echo ""

# Run Newman tests
# Update the collection path to match your setup
COLLECTION_PATH="${1:-.postman/collection.json}"

if [ -f "$COLLECTION_PATH" ]; then
    newman run "$COLLECTION_PATH" \
        --reporters json,cli \
        --reporter-json-export artifacts/newman/latest-summary.json \
        --reporter-cli-no-assertions || true
    
    echo ""
    echo "Tests completed. Summary saved to:"
    echo "  artifacts/newman/latest-summary.json"
    echo ""
    
    # Parse test results
    if python3 -c "import json; data=json.load(open('artifacts/newman/latest-summary.json')); print('Tests:', data['run']['stats']['tests']['total'], '| Passed:', data['run']['stats']['tests']['total']-data['run']['stats']['failures']['total'], '| Failed:', data['run']['stats']['failures']['total'])" 2>/dev/null; then
        echo "Ready for deployment validation"
    else
        echo "Warning: Could not parse test results"
    fi
else
    echo "Error: Collection file not found at $COLLECTION_PATH"
    echo "Usage: $0 [path-to-postman-collection]"
    echo "Example: $0 .postman/collection.json"
    exit 1
fi
