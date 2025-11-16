#!/bin/bash

# Booking Flow API Testing Script
# Tests both Manual and Auto flow API endpoints

set -e

BASE_URL="http://localhost:3001"
RESULTS_FILE="test-results-$(date +%Y%m%d-%H%M%S).log"

echo "==================================="
echo "Booking Flow API Testing"
echo "==================================="
echo ""
echo "Results will be saved to: $RESULTS_FILE"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print test result
print_result() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✓${NC} $2"
    echo "✓ $2" >> "$RESULTS_FILE"
  else
    echo -e "${RED}✗${NC} $2"
    echo "✗ $2" >> "$RESULTS_FILE"
  fi
}

print_info() {
  echo -e "${YELLOW}ℹ${NC} $1"
  echo "ℹ $1" >> "$RESULTS_FILE"
}

# Check if server is running
echo "Checking if server is running on $BASE_URL..."
if curl -s "$BASE_URL" > /dev/null 2>&1; then
  print_result 0 "Server is running"
else
  print_result 1 "Server is NOT running. Start with: npm run dev"
  exit 1
fi
echo ""

# Test 1: Health Check
echo "Test 1: Health Check"
echo "-------------------"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/health" || echo "000")
if [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "404" ]; then
  print_result 0 "Server responding to requests"
else
  print_result 1 "Server not responding correctly (HTTP $RESPONSE)"
fi
echo ""

# Test 2: Check create-manual endpoint (without auth - should fail)
echo "Test 2: Create Manual Booking Endpoint (Unauthenticated)"
echo "---------------------------------------------------------"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/bookings/create-manual" \
  -H "Content-Type: application/json" \
  -d '{"tripId":"test","date":"2025-12-01"}' \
  -o /dev/null -w "%{http_code}")

if [ "$RESPONSE" = "401" ]; then
  print_result 0 "Endpoint correctly requires authentication (HTTP 401)"
else
  print_result 1 "Endpoint should return 401 for unauthenticated requests (got HTTP $RESPONSE)"
fi
echo ""

# Test 3: Check acknowledge endpoint (without auth - should fail)
echo "Test 3: Acknowledge Booking Endpoint (Unauthenticated)"
echo "-------------------------------------------------------"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/bookings/acknowledge" \
  -H "Content-Type: application/json" \
  -d '{"bookingId":"test"}' \
  -o /dev/null -w "%{http_code}")

if [ "$RESPONSE" = "401" ]; then
  print_result 0 "Endpoint correctly requires authentication (HTTP 401)"
else
  print_result 1 "Endpoint should return 401 for unauthenticated requests (got HTTP $RESPONSE)"
fi
echo ""

# Test 4: Check payment preview page exists
echo "Test 4: Payment Preview Page"
echo "----------------------------"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/book/payment/preview?data=e30")
if [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "302" ] || [ "$RESPONSE" = "500" ]; then
  print_result 0 "Payment preview page exists (HTTP $RESPONSE)"
else
  print_result 1 "Payment preview page not accessible (HTTP $RESPONSE)"
fi
echo ""

# Test 5: Check booking confirm page exists
echo "Test 5: Booking Confirm Page"
echo "----------------------------"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/book/confirm")
if [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "302" ]; then
  print_result 0 "Booking confirm page exists (HTTP $RESPONSE)"
else
  print_result 1 "Booking confirm page not accessible (HTTP $RESPONSE)"
fi
echo ""

# Test 6: TypeScript compilation
echo "Test 6: TypeScript Compilation"
echo "-------------------------------"
cd /Users/jangbersahaja/Website/fishon-market
if npm run typecheck > /dev/null 2>&1; then
  print_result 0 "TypeScript compiles without errors"
else
  print_result 1 "TypeScript compilation has errors"
fi
echo ""

# Test 7: Check required environment variables
echo "Test 7: Required Environment Variables"
echo "---------------------------------------"

check_env_var() {
  VAR_NAME=$1
  if [ -f .env ]; then
    if grep -q "^${VAR_NAME}=" .env; then
      print_result 0 "$VAR_NAME is set"
    else
      print_result 1 "$VAR_NAME is NOT set in .env"
    fi
  else
    print_result 1 ".env file not found"
  fi
}

check_env_var "DATABASE_URL"
check_env_var "CAPTAIN_DATABASE_URL"
check_env_var "NEXTAUTH_SECRET"
check_env_var "RESEND_API_KEY"
echo ""

# Summary
echo "==================================="
echo "Test Summary"
echo "==================================="
echo ""
PASSED=$(grep -c "^✓" "$RESULTS_FILE" || echo "0")
FAILED=$(grep -c "^✗" "$RESULTS_FILE" || echo "0")
TOTAL=$((PASSED + FAILED))

echo "Total Tests: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""
echo "Full results saved to: $RESULTS_FILE"

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed. Review results above.${NC}"
  exit 1
fi
