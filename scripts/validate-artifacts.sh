#!/bin/bash

# Artifact Validation Script
# Ensures all required deployment artifacts are present and valid

set -e

echo "Starting artifact validation..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track validation status
VALIDATION_FAILED=0

# Create artifacts directory if needed
mkdir -p artifacts/newman

# Check Newman artifact
echo -e "${YELLOW}Checking Newman artifact...${NC}"
if [ -f "artifacts/newman/latest-summary.json" ]; then
    echo -e "${GREEN}✓ Newman artifact found${NC}"
    
    # Validate JSON
    if python3 -c "import json; json.load(open('artifacts/newman/latest-summary.json'))" 2>/dev/null; then
        echo -e "${GREEN}✓ Newman artifact is valid JSON${NC}"
    else
        echo -e "${RED}✗ Newman artifact JSON is invalid${NC}"
        VALIDATION_FAILED=1
    fi
else
    echo -e "${YELLOW}⚠ Newman artifact not found${NC}"
    echo "  Run: npm run test:api to generate"
fi

echo ""

# Check package.json
echo -e "${YELLOW}Checking package.json...${NC}"
if [ -f "package.json" ]; then
    echo -e "${GREEN}✓ package.json found${NC}"
    
    if python3 -c "import json; json.load(open('package.json'))" 2>/dev/null; then
        echo -e "${GREEN}✓ package.json is valid JSON${NC}"
    else
        echo -e "${RED}✗ package.json is invalid${NC}"
        VALIDATION_FAILED=1
    fi
else
    echo -e "${RED}✗ package.json not found${NC}"
    VALIDATION_FAILED=1
fi

echo ""

# Summary
echo "═════════════════════════════════════"
if [ $VALIDATION_FAILED -eq 0 ]; then
    echo -e "${GREEN}Artifact Validation: PASSED ✓${NC}"
    echo "═════════════════════════════════════"
    exit 0
else
    echo -e "${RED}Artifact Validation: FAILED ✗${NC}"
    echo "═════════════════════════════════════"
    exit 1
fi
