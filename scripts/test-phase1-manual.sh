#!/bin/bash

# Phase 1 Messaging API Manual Test Script
# 
# This script provides curl commands to test all Phase 1 endpoints
# You'll need to replace AUTH_COOKIE with your actual session cookie
#
# Usage:
# 1. Sign in to fishon-market (http://localhost:3001) in your browser
# 2. Open DevTools → Application → Cookies
# 3. Copy the session cookie value
# 4. Replace AUTH_COOKIE below with your cookie
# 5. Run: bash scripts/test-phase1-manual.sh

# ANSI Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Configuration
MARKET_URL="http://localhost:3001"
CAPTAIN_URL="http://localhost:3000"

# TODO: Replace with your actual auth cookie from browser DevTools
AUTH_COOKIE="next-auth.session-token=YOUR_SESSION_TOKEN_HERE"

# Test results
PASSED=0
FAILED=0

echo -e "${BOLD}${BLUE}🧪 Phase 1 Messaging API Manual Test${NC}"
echo -e "${BLUE}======================================${NC}\n"

# Helper function to run test
run_test() {
    local name="$1"
    local method="$2"
    local url="$3"
    local data="$4"
    local expected_status="${5:-200}"
    
    echo -e "${BOLD}Testing: ${name}${NC}"
    echo -e "${BLUE}${method} ${url}${NC}"
    
    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
            -H "Cookie: $AUTH_COOKIE" \
            -H "Content-Type: application/json")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
            -H "Cookie: $AUTH_COOKIE" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC} - Status: $http_code"
        ((PASSED++))
    else
        echo -e "${RED}❌ FAIL${NC} - Expected: $expected_status, Got: $http_code"
        ((FAILED++))
    fi
    
    echo "Response:"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
    echo -e "\n"
}

# Check if auth cookie is set
if [ "$AUTH_COOKIE" = "next-auth.session-token=YOUR_SESSION_TOKEN_HERE" ]; then
    echo -e "${RED}❌ ERROR: Please set your AUTH_COOKIE first!${NC}\n"
    echo -e "${YELLOW}Instructions:${NC}"
    echo "1. Sign in to fishon-market (http://localhost:3001)"
    echo "2. Open DevTools → Application → Cookies"
    echo "3. Copy the 'next-auth.session-token' value"
    echo "4. Edit this script and replace AUTH_COOKIE value"
    echo "5. Run again"
    exit 1
fi

# Check if servers are running
echo -e "${BOLD}Checking servers...${NC}"
if ! curl -s -o /dev/null -w "%{http_code}" "$MARKET_URL" | grep -q "200\|301\|302\|404"; then
    echo -e "${RED}❌ fishon-market is not running on port 3001${NC}"
    exit 1
fi
echo -e "${GREEN}✅ fishon-market is running${NC}"

if ! curl -s -o /dev/null -w "%{http_code}" "$CAPTAIN_URL" | grep -q "200\|301\|302\|404"; then
    echo -e "${RED}❌ fishon-captain is not running on port 3000${NC}"
    exit 1
fi
echo -e "${GREEN}✅ fishon-captain is running${NC}\n"

echo -e "${BOLD}${BLUE}Part 1: fishon-market Endpoints${NC}\n"

# Test 1: List conversations (angler)
run_test \
    "1.1 List conversations (angler)" \
    "GET" \
    "$MARKET_URL/api/conversations?role=angler&limit=10" \
    "" \
    200

# Test 2: List conversations (invalid role)
run_test \
    "1.2 List conversations (invalid role - should fail)" \
    "GET" \
    "$MARKET_URL/api/conversations?role=invalid" \
    "" \
    400

# TODO: Get a real conversation ID from the response above
CONVERSATION_ID="REPLACE_WITH_REAL_CONVERSATION_ID"

if [ "$CONVERSATION_ID" = "REPLACE_WITH_REAL_CONVERSATION_ID" ]; then
    echo -e "${YELLOW}⏭️  Skipping conversation-specific tests (no conversation ID)${NC}"
    echo -e "${YELLOW}   Please create a booking first, then update CONVERSATION_ID in this script${NC}\n"
else
    # Test 3: Get single conversation
    run_test \
        "1.3 Get single conversation" \
        "GET" \
        "$MARKET_URL/api/conversations/$CONVERSATION_ID" \
        "" \
        200
    
    # Test 4: List messages
    run_test \
        "1.4 List messages" \
        "GET" \
        "$MARKET_URL/api/conversations/$CONVERSATION_ID/messages?limit=50" \
        "" \
        200
    
    # Test 5: Send message
    run_test \
        "1.5 Send message" \
        "POST" \
        "$MARKET_URL/api/conversations/$CONVERSATION_ID/messages" \
        '{"content":"Test message from API test script","contentType":"text"}' \
        201
    
    # Test 6: Mark as read
    run_test \
        "1.6 Mark conversation as read" \
        "PATCH" \
        "$MARKET_URL/api/conversations/$CONVERSATION_ID/read" \
        "" \
        200
    
    # Test 7: Close conversation (optional)
    # run_test \
    #     "1.7 Close conversation" \
    #     "PATCH" \
    #     "$MARKET_URL/api/conversations/$CONVERSATION_ID/close" \
    #     "" \
    #     200
fi

echo -e "${BOLD}${BLUE}Part 2: fishon-captain Endpoints${NC}\n"

# Test 8: List captain conversations
run_test \
    "2.1 List captain conversations" \
    "GET" \
    "$CAPTAIN_URL/api/messages/conversations?limit=10" \
    "" \
    200

# Test 9: Send message as captain
if [ "$CONVERSATION_ID" != "REPLACE_WITH_REAL_CONVERSATION_ID" ]; then
    run_test \
        "2.2 Send message as captain" \
        "POST" \
        "$CAPTAIN_URL/api/messages/send" \
        "{\"conversationId\":\"$CONVERSATION_ID\",\"content\":\"Test reply from captain\"}" \
        200
fi

# Summary
echo -e "${BOLD}${BLUE}======================================${NC}"
echo -e "${BOLD}${BLUE}📊 Test Results Summary${NC}"
echo -e "${BLUE}======================================${NC}"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo -e "${BLUE}Total: $((PASSED + FAILED))${NC}\n"

if [ $FAILED -eq 0 ] && [ $PASSED -gt 0 ]; then
    echo -e "${GREEN}${BOLD}✅ All tests passed!${NC}\n"
    exit 0
else
    echo -e "${YELLOW}${BOLD}⚠️  Some tests failed or were skipped${NC}"
    echo -e "${YELLOW}See above for details${NC}\n"
    exit 1
fi
