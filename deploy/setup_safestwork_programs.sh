#!/bin/bash
# SafestWork Programs Setup — Run against PRODUCTION
# Usage: bash setup_safestwork_programs.sh

API_URL="https://hrbank.ca"

echo "=== Logging in as SafestWork ==="
TOKEN=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"aleblanc@safestwork.com","password":"SafestWork2026!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['access_token'])")

if [ -z "$TOKEN" ]; then
  echo "ERROR: Login failed. Make sure the account exists in production DB."
  exit 1
fi
echo "Login successful"

echo ""
echo "=== Creating Faculty ==="
FAC_RESULT=$(curl -s -X POST "$API_URL/api/institution/programs/faculties" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"faculty_name":"Health & Safety Training","description":"CPO-Approved occupational health and safety certification programs","icon":"🛡️","color":"#DC2626"}')

FAC_ID=$(echo "$FAC_RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('faculty_id',''))" 2>/dev/null)

if [ -z "$FAC_ID" ]; then
  echo "Faculty may already exist. Fetching existing..."
  FAC_ID=$(curl -s "$API_URL/api/institution/programs/faculties" \
    -H "Authorization: Bearer $TOKEN" \
    | python3 -c "import sys,json; facs=json.load(sys.stdin).get('data',{}).get('faculties',[]); print(facs[0]['faculty_id'] if facs else '')")
fi

echo "Faculty ID: $FAC_ID"

echo ""
echo "=== Creating Programs ==="

create_program() {
  local name="$1"
  local code="$2"
  local desc="$3"
  local cred_type="$4"
  local duration="$5"
  local mode="$6"
  
  local data="{\"faculty_id\":\"$FAC_ID\",\"program_name\":\"$name\",\"program_code\":\"$code\",\"description\":\"$desc\",\"credential_type\":\"$cred_type\",\"duration_weeks\":1,\"duration_display\":\"$duration\",\"delivery_mode\":\"$mode\",\"status\":\"active\"}"
  
  local result=$(curl -s -X POST "$API_URL/api/institution/programs" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$data")
  
  local pname=$(echo "$result" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('program_name', 'FAILED: '+d.get('detail','unknown')))" 2>&1)
  echo "  $pname"
}

create_program "Working at Heights Training" "WAH-001" "CPO-Approved working at heights training" "Certificate" "1 Day" "In-Class"
create_program "Forklift Training (Class 1, 4, 5)" "FLT-001" "Comprehensive forklift operator training" "License" "1-2 Days" "In-Class"
create_program "CPR First Aid Training" "CPR-001" "Standard and emergency first aid with CPR/AED" "Certificate" "1-2 Days" "In-Class"
create_program "Respirator Fit Test Training" "RFT-001" "Quantitative and qualitative respirator fit testing" "Certificate" "Half Day" "In-Class"
create_program "Traffic Control Training" "TCP-001" "Traffic control person certification" "Certificate" "1 Day" "In-Class"
create_program "TDG Training" "TDG-001" "Transportation of Dangerous Goods certification" "Certificate" "1 Day" "In-Class"
create_program "WHMIS 2015/GHS Certification" "WHM-001" "Workplace Hazardous Materials Information System training" "Certificate" "Half Day" "In-Class"
create_program "Overhead Crane Training" "OCT-001" "Overhead crane and hoisting equipment operator certification" "License" "1 Day" "In-Class"
create_program "LOTOTO Training" "LOT-001" "Lockout/Tagout/Tryout energy control procedures" "Certificate" "Half Day" "In-Class"
create_program "Confined Space Training" "CST-001" "Confined space entry, awareness, and rescue procedures" "Certificate" "1 Day" "In-Class"
create_program "Worker Health & Safety in 4-Steps" "WHS-001" "Foundational workplace health and safety awareness" "Certificate" "Half Day" "In-Class"
create_program "Supervisor Health & Safety in 5-Steps" "SHS-001" "Supervisor-level occupational health and safety compliance" "Certificate" "1 Day" "In-Class"

echo ""
echo "=== DONE ==="
echo "12 programs created under Health & Safety Training faculty"
