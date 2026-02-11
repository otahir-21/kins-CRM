#!/bin/bash

# Feed API Test Script
# Tests all feed endpoints locally

BASE_URL="http://localhost:3000"
API_V1="$BASE_URL/api/v1"

echo "========================================="
echo "  FEED API TEST SUITE"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASS=0
FAIL=0

test_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}: $2"
        ((PASS++))
    else
        echo -e "${RED}✗ FAIL${NC}: $2"
        ((FAIL++))
    fi
}

# 1. Health check
echo "1. Testing server health..."
RESPONSE=$(curl -s "$BASE_URL/health")
if echo "$RESPONSE" | jq -e '.status == "ok"' > /dev/null; then
    test_result 0 "Server is healthy"
else
    test_result 1 "Server health check failed"
    exit 1
fi
echo ""

# 2. Get interests
echo "2. Getting available interests..."
INTEREST_ID=$(curl -s "$API_V1/interests" | jq -r '.interests[0].id')
if [ -n "$INTEREST_ID" ] && [ "$INTEREST_ID" != "null" ]; then
    test_result 0 "Got interest ID: $INTEREST_ID"
else
    test_result 1 "Failed to get interest ID"
    exit 1
fi
echo ""

# 3. Create test users
echo "3. Creating test users..."
TOKEN1=$(curl -s -X POST "$API_V1/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
        "provider": "phone",
        "providerUserId": "+1111111111",
        "phoneNumber": "+1111111111",
        "name": "Test User Alpha"
    }' | jq -r '.token')

TOKEN2=$(curl -s -X POST "$API_V1/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
        "provider": "phone",
        "providerUserId": "+2222222222",
        "phoneNumber": "+2222222222",
        "name": "Test User Beta"
    }' | jq -r '.token')

if [ -n "$TOKEN1" ] && [ "$TOKEN1" != "null" ]; then
    test_result 0 "User 1 created and logged in"
else
    test_result 1 "User 1 creation failed"
fi

if [ -n "$TOKEN2" ] && [ "$TOKEN2" != "null" ]; then
    test_result 0 "User 2 created and logged in"
else
    test_result 1 "User 2 creation failed"
fi
echo ""

# 4. Set interests for both users
echo "4. Setting interests for users..."
RESULT1=$(curl -s -X POST "$API_V1/me/interests" \
    -H "Authorization: Bearer $TOKEN1" \
    -H "Content-Type: application/json" \
    -d "{\"interestIds\": [\"$INTEREST_ID\"]}" | jq -r '.success')

RESULT2=$(curl -s -X POST "$API_V1/me/interests" \
    -H "Authorization: Bearer $TOKEN2" \
    -H "Content-Type: application/json" \
    -d "{\"interestIds\": [\"$INTEREST_ID\"]}" | jq -r '.success')

[ "$RESULT1" = "true" ] && test_result 0 "User 1 interests set" || test_result 1 "User 1 interests failed"
[ "$RESULT2" = "true" ] && test_result 0 "User 2 interests set" || test_result 1 "User 2 interests failed"
echo ""

# 5. Create text post
echo "5. Creating text post..."
POST1_ID=$(curl -s -X POST "$API_V1/posts" \
    -H "Authorization: Bearer $TOKEN1" \
    -H "Content-Type: application/json" \
    -d "{
        \"type\": \"text\",
        \"content\": \"Hello from the feed test!\",
        \"interestIds\": [\"$INTEREST_ID\"]
    }" | jq -r '.post._id')

if [ -n "$POST1_ID" ] && [ "$POST1_ID" != "null" ]; then
    test_result 0 "Text post created: $POST1_ID"
else
    test_result 1 "Text post creation failed"
fi
echo ""

# 6. Create poll post
echo "6. Creating poll post..."
POST2_ID=$(curl -s -X POST "$API_V1/posts" \
    -H "Authorization: Bearer $TOKEN1" \
    -H "Content-Type: application/json" \
    -d "{
        \"type\": \"poll\",
        \"content\": \"Quick poll!\",
        \"poll\": {
            \"question\": \"Favorite language?\",
            \"options\": [{\"text\": \"JavaScript\"}, {\"text\": \"Python\"}, {\"text\": \"Go\"}]
        },
        \"interestIds\": [\"$INTEREST_ID\"]
    }" | jq -r '.post._id')

if [ -n "$POST2_ID" ] && [ "$POST2_ID" != "null" ]; then
    test_result 0 "Poll post created: $POST2_ID"
else
    test_result 1 "Poll post creation failed"
fi
echo ""

# Wait for fan-out to complete
echo "⏳ Waiting 2 seconds for feed fan-out..."
sleep 2
echo ""

# 7. Get User 2's feed (should see User 1's posts)
echo "7. Testing feed retrieval..."
FEED_COUNT=$(curl -s -X GET "$API_V1/feed?page=1&limit=20" \
    -H "Authorization: Bearer $TOKEN2" | jq '.feed | length')

if [ "$FEED_COUNT" -ge 2 ]; then
    test_result 0 "User 2 feed has $FEED_COUNT posts"
else
    test_result 1 "User 2 feed has only $FEED_COUNT posts (expected 2+)"
fi
echo ""

# 8. Test pagination
echo "8. Testing feed pagination..."
PAGINATION=$(curl -s -X GET "$API_V1/feed?page=1&limit=1" \
    -H "Authorization: Bearer $TOKEN2" | jq -r '.pagination.hasMore')

if [ "$PAGINATION" = "true" ]; then
    test_result 0 "Pagination works correctly"
else
    test_result 1 "Pagination failed"
fi
echo ""

# 9. Get single post
echo "9. Testing single post retrieval..."
POST_TYPE=$(curl -s -X GET "$API_V1/posts/$POST1_ID" \
    -H "Authorization: Bearer $TOKEN2" | jq -r '.post.type')

if [ "$POST_TYPE" = "text" ]; then
    test_result 0 "Single post retrieved successfully"
else
    test_result 1 "Single post retrieval failed"
fi
echo ""

# 10. Test post deletion (authorized)
echo "10. Testing post deletion (as author)..."
DELETE_SUCCESS=$(curl -s -X DELETE "$API_V1/posts/$POST1_ID" \
    -H "Authorization: Bearer $TOKEN1" | jq -r '.success')

if [ "$DELETE_SUCCESS" = "true" ]; then
    test_result 0 "Post deleted successfully"
else
    test_result 1 "Post deletion failed"
fi
echo ""

# 11. Test unauthorized deletion
echo "11. Testing unauthorized deletion..."
DELETE_ERROR=$(curl -s -X DELETE "$API_V1/posts/$POST2_ID" \
    -H "Authorization: Bearer $TOKEN2" | jq -r '.error')

if echo "$DELETE_ERROR" | grep -q "Not authorized"; then
    test_result 0 "Unauthorized deletion blocked correctly"
else
    test_result 1 "Unauthorized deletion not blocked"
fi
echo ""

# 12. Test missing auth
echo "12. Testing missing authentication..."
AUTH_ERROR=$(curl -s -X GET "$API_V1/feed" | jq -r '.error')

if echo "$AUTH_ERROR" | grep -q "Authorization"; then
    test_result 0 "Missing auth handled correctly"
else
    test_result 1 "Missing auth not handled"
fi
echo ""

# 13. Test invalid post ID
echo "13. Testing invalid post ID..."
INVALID_ERROR=$(curl -s -X GET "$API_V1/posts/invalid-id" \
    -H "Authorization: Bearer $TOKEN1" | jq -r '.error')

if echo "$INVALID_ERROR" | grep -q "Invalid"; then
    test_result 0 "Invalid post ID handled correctly"
else
    test_result 1 "Invalid post ID not handled"
fi
echo ""

# 14. Test post without interests
echo "14. Testing post without interests..."
NO_INTEREST_ERROR=$(curl -s -X POST "$API_V1/posts" \
    -H "Authorization: Bearer $TOKEN1" \
    -H "Content-Type: application/json" \
    -d '{"type": "text", "content": "No interests"}' | jq -r '.error')

if echo "$NO_INTEREST_ERROR" | grep -q "interest"; then
    test_result 0 "Post without interests rejected"
else
    test_result 1 "Post without interests not rejected"
fi
echo ""

# Summary
echo "========================================="
echo "  TEST SUMMARY"
echo "========================================="
echo -e "${GREEN}Passed: $PASS${NC}"
echo -e "${RED}Failed: $FAIL${NC}"
echo "Total:  $((PASS + FAIL))"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi
