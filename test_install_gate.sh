#!/bin/bash
# Test script: centralized app-installation validation on the Literary App backend.
BASE="http://localhost:3001"
GOOD=0
BAD=0

check() {
  local name="$1" expected="$2" actual="$3"
  if [ "$actual" = "$expected" ]; then
    echo "PASS  $name (expected=$expected)"
    GOOD=$((GOOD+1))
  else
    echo "FAIL  $name (expected=$expected actual=$actual)"
    BAD=$((BAD+1))
  fi
}

echo "=== 1. OAuth install-status endpoint ==="
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/oauth/status")
check "GET /oauth/status with NO locationId -> 400" "400" "$code"

body=$(curl -s "$BASE/oauth/status?locationId=not-installed-abc")
code=$(echo "$body" | head -c 400)
echo "     GET /oauth/status?locationId=not-installed-abc -> $code"

echo ""
echo "=== 2. requireInstalled middleware (data routes) ==="
# Installed-missing (fake Supabase => DB error => pass-through to handler => 400/500)
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/analytics?locationId=not-installed-abc")
echo "     GET /analytics?locationId=fake -> $code (400 no-data or 5xx DB error expected, NOT 426 since DB unreachable)"

# Missing locationId => pass-through, handler returns 400
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/analytics")
check "GET /analytics with NO locationId -> 400" "400" "$code"

# Books
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/books?locationId=x")
if [ "$code" = "400" ] || [ "$code" = "500" ] || [ "$code" = "503" ]; then echo "PASS  GET /books (middleware pass-through works; handler returns 400 when locId missing, 500 when DB unreachable)"; GOOD=$((GOOD+1)); else echo "FAIL  GET /books (unexpected $code)"; BAD=$((BAD+1)); fi

# Workflow action (locationId present, app not installed) — Supabase unreachable so middleware passes through; expect handler 5xx from Lulu call
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/workflow-action/create-print-job" -H "Content-Type: application/json" -d '{"locationId":"not-installed-abc","contactId":"c1","bookId":"b1"}')
echo "     POST /workflow-action/create-print-job (no install) -> $code (5xx from Lulu expected; install check passes when DB unreachable)"

echo ""
echo "=== 3. Exempt routes ==="
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/health")
check "GET /health -> 200 (exempt)" "200" "$code"

code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/oauth/webhook" -H "Content-Type: application/json" -d '{"eventType":"UNINSTALL"}')
check "POST /oauth/webhook -> 200 (exempt; body logged)" "200" "$code"

echo ""
echo "=== 4. Quotes routes (calc needs locId in body for Lulu; options endpoint is location-free) ==="
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/quotes/options")
check "GET /quotes/options -> 200 (no location needed)" "200" "$code"

echo ""
echo "=== RESULTS: $GOOD passed, $BAD failed ==="
