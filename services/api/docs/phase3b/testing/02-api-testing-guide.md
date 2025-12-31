# ERA API TESTING GUIDE
## Phase 3B - ERA Processing & Auto-Posting

**Version:** 1.0
**Last Updated:** December 27, 2025
**API Base URL:** `http://localhost:3000/api` (development)

---

## TABLE OF CONTENTS

1. [Getting Started](#getting-started)
2. [Authentication](#authentication)
3. [Testing Methods](#testing-methods)
4. [API Endpoints Reference](#api-endpoints-reference)
5. [cURL Command Examples](#curl-command-examples)
6. [Test Scenarios](#test-scenarios)
7. [Troubleshooting](#troubleshooting)

---

## GETTING STARTED

### Prerequisites

1. **Start the application server:**
   ```bash
   npm start
   ```

2. **Verify server is running:**
   ```bash
   curl http://localhost:3000/api/health
   ```

   Expected response:
   ```json
   {
     "status": "healthy",
     "database": "connected",
     "timestamp": "2025-01-27T12:00:00.000Z"
   }
   ```

3. **Obtain authentication token:**
   - Log in via `/api/auth/login`
   - Copy the returned JWT token
   - Use in subsequent requests

---

## AUTHENTICATION

All ERA endpoints require authentication via Bearer token.

### Get Auth Token

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com",
    "password": "yourpassword"
  }'
```

### Use Token in Requests

```bash
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  http://localhost:3000/api/era/files
```

**Set token as environment variable (recommended):**

```bash
export AUTH_TOKEN="your_jwt_token_here"
```

Then use in requests:
```bash
curl -H "Authorization: Bearer $AUTH_TOKEN" \
  http://localhost:3000/api/era/files
```

---

## TESTING METHODS

### Method 1: Automated Node.js Script ✅ RECOMMENDED

**Run the complete test suite:**

```bash
node scripts/test-era-api.js
```

**With custom configuration:**

```bash
AUTH_TOKEN="your_token" API_BASE_URL="http://localhost:3000/api" \
  node scripts/test-era-api.js
```

**Features:**
- ✅ Tests all 8 ERA endpoints
- ✅ Automatic test result tracking
- ✅ Detailed output with colors
- ✅ Pass/fail summary

---

### Method 2: Postman Collection ⚡ INTERACTIVE

**Import the collection:**

1. Open Postman
2. Click "Import"
3. Select file: `postman/ERA_API_Tests.postman_collection.json`

**Configure variables:**

1. Click on the collection
2. Go to "Variables" tab
3. Set values:
   - `base_url`: `http://localhost:3000/api`
   - `auth_token`: Your JWT token

**Run tests:**

1. Click "Run" on the collection
2. Select all requests
3. Click "Run Phase 3B - ERA Processing API"

**Features:**
- ✅ Interactive testing
- ✅ Pre-built test scripts
- ✅ Variable management
- ✅ Response visualization

---

### Method 3: cURL Commands 🔧 MANUAL

**Advantages:**
- No dependencies
- Quick one-off tests
- Easy to automate in shell scripts
- Works on any system with curl

**See [cURL Command Examples](#curl-command-examples) below**

---

## API ENDPOINTS REFERENCE

### Base URL
```
http://localhost:3000/api
```

### Endpoint Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/era/upload` | Upload 835 file |
| POST | `/era/process/:fileId` | Reprocess file |
| GET | `/era/files` | List ERA files |
| GET | `/era/file/:fileId` | Get file details |
| GET | `/era/payments/:fileId` | Get payments |
| GET | `/era/exceptions` | Get exceptions |
| POST | `/era/resolve-exception/:id` | Resolve exception |
| GET | `/era/reconciliation` | Get reconciliation |
| POST | `/era/reconcile-batch` | Create reconciliation |

---

## cURL COMMAND EXAMPLES

### 0. Health Check

```bash
curl -X GET http://localhost:3000/api/health
```

---

### 1. Upload 835 ERA File

```bash
curl -X POST http://localhost:3000/api/era/upload \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "TEST_ERA_20250127.835",
    "fileContent": "ISA*00*          *00*          *ZZ*PAYERID        *ZZ*PROVIDERID     *250127*1200*^*00501*000000001*0*P*:~GS*HP*PAYERID*PROVIDERID*20250127*1200*1*X*005010X221A1~ST*835*0001*005010X221A1~BPR*I*12450.00*C*ACH*CTX*01*123456789*DA*987654321*1234567890**01*987654321*20250127~TRN*1*1234567890*1234567890~N1*PR*TEST MEDICARE~N1*PE*HOSPICE CARE*XX*1234567890~CLP*TEST-001*1*12450.00*12450.00*0.00*MC*ICN001*11*1~NM1*QC*1*DOE*JOHN****MI*ABC123456A~SE*12*0001~GE*1*1~IEA*1*000000001~"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "ERA file uploaded and processed successfully",
  "data": {
    "eraFileId": 123,
    "summary": {
      "totalClaims": 1,
      "autoPosted": 1,
      "exceptions": 0,
      "totalAmount": 1245000
    }
  }
}
```

---

### 2. Get ERA Files List

```bash
curl -X GET "http://localhost:3000/api/era/files?status=COMPLETED&limit=10" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

**With filters:**

```bash
# Get pending files
curl -X GET "http://localhost:3000/api/era/files?status=PENDING&limit=5" \
  -H "Authorization: Bearer $AUTH_TOKEN"

# Get error files
curl -X GET "http://localhost:3000/api/era/files?status=ERROR" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

---

### 3. Get ERA File Details

```bash
curl -X GET "http://localhost:3000/api/era/file/FILE_ID_HERE" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

**Example:**
```bash
FILE_ID="era_abc123"
curl -X GET "http://localhost:3000/api/era/file/$FILE_ID" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

---

### 4. Get ERA Payments for File

```bash
curl -X GET "http://localhost:3000/api/era/payments/123" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

**Note:** Use the database ID (integer), not the file_id string.

---

### 5. Get Posting Exceptions

**Get all pending exceptions:**

```bash
curl -X GET "http://localhost:3000/api/era/exceptions?status=PENDING&limit=50" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

**Filter by severity:**

```bash
# High severity only
curl -X GET "http://localhost:3000/api/era/exceptions?severity=HIGH" \
  -H "Authorization: Bearer $AUTH_TOKEN"

# Critical exceptions
curl -X GET "http://localhost:3000/api/era/exceptions?severity=CRITICAL" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

**Get resolved exceptions:**

```bash
curl -X GET "http://localhost:3000/api/era/exceptions?status=RESOLVED&limit=20" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

---

### 6. Resolve Posting Exception

```bash
curl -X POST "http://localhost:3000/api/era/resolve-exception/EXCEPTION_ID" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "resolutionType": "MANUAL_POSTED",
    "notes": "Manually posted to claim #1001 after patient account correction"
  }'
```

**Valid resolution types:**
- `MANUAL_POSTED` - Payment manually posted
- `CLAIM_CORRECTED` - Claim data corrected and reprocessed
- `PAYER_CONTACTED` - Issue escalated to payer
- `WRITTEN_OFF` - Amount written off
- `REFUNDED` - Payment refunded to payer

**Example with different resolution type:**

```bash
curl -X POST "http://localhost:3000/api/era/resolve-exception/exc_xyz789" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "resolutionType": "CLAIM_CORRECTED",
    "notes": "Corrected patient account number in system. File will be reprocessed."
  }'
```

---

### 7. Get Reconciliation Batches

**Get all batches:**

```bash
curl -X GET "http://localhost:3000/api/era/reconciliation" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

**Filter by date:**

```bash
curl -X GET "http://localhost:3000/api/era/reconciliation?batchDate=2025-01-27" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

---

### 8. Create Reconciliation Batch

```bash
curl -X POST "http://localhost:3000/api/era/reconcile-batch" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "batchDate": "2025-01-27",
    "depositAmount": 3735000,
    "bankStatementAmount": 3735000
  }'
```

**Example with variance:**

```bash
# Bank deposit is $10 short
curl -X POST "http://localhost:3000/api/era/reconcile-batch" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "batchDate": "2025-01-27",
    "depositAmount": 3735000,
    "bankStatementAmount": 3734000
  }'
```

**Amount format:**
- All amounts in cents
- $373.50 = 37350
- $1,000.00 = 100000

---

### 9. Reprocess ERA File

```bash
curl -X POST "http://localhost:3000/api/era/process/FILE_ID" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

---

### 10. Auto-Post Individual Payment

```bash
curl -X POST "http://localhost:3000/api/era/auto-post/PAYMENT_ID" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "claimId": 123
  }'
```

**Note:** Currently returns 501 (Not Implemented) as auto-posting happens during file upload.

---

## TEST SCENARIOS

### Scenario 1: Upload File and Check Results

```bash
# 1. Upload file
RESPONSE=$(curl -s -X POST http://localhost:3000/api/era/upload \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d @test-era-file.json)

echo "Upload response: $RESPONSE"

# 2. Extract file ID (requires jq)
FILE_ID=$(echo $RESPONSE | jq -r '.data.eraFileId')
echo "ERA File ID: $FILE_ID"

# 3. Get file details
curl -X GET "http://localhost:3000/api/era/file/$FILE_ID" \
  -H "Authorization: Bearer $AUTH_TOKEN"

# 4. Get payments
curl -X GET "http://localhost:3000/api/era/payments/$FILE_ID" \
  -H "Authorization: Bearer $AUTH_TOKEN"

# 5. Check for exceptions
curl -X GET "http://localhost:3000/api/era/exceptions?status=PENDING" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

---

### Scenario 2: Exception Resolution Workflow

```bash
# 1. Get pending exceptions
EXCEPTIONS=$(curl -s -X GET "http://localhost:3000/api/era/exceptions?status=PENDING" \
  -H "Authorization: Bearer $AUTH_TOKEN")

echo "Pending exceptions: $EXCEPTIONS"

# 2. Extract first exception ID (requires jq)
EXCEPTION_ID=$(echo $EXCEPTIONS | jq -r '.data[0].exception_id')
echo "Resolving exception: $EXCEPTION_ID"

# 3. Resolve exception
curl -X POST "http://localhost:3000/api/era/resolve-exception/$EXCEPTION_ID" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "resolutionType": "MANUAL_POSTED",
    "notes": "Resolved via test scenario"
  }'

# 4. Verify resolution
curl -X GET "http://localhost:3000/api/era/exceptions?status=RESOLVED" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

---

### Scenario 3: Daily Reconciliation

```bash
TODAY=$(date +%Y-%m-%d)

# 1. Get all ERA files for today
FILES=$(curl -s -X GET "http://localhost:3000/api/era/files" \
  -H "Authorization: Bearer $AUTH_TOKEN")

echo "Files for $TODAY: $FILES"

# 2. Calculate expected deposit (example: $373.50)
DEPOSIT_AMOUNT=37350

# 3. Create reconciliation batch
curl -X POST "http://localhost:3000/api/era/reconcile-batch" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"batchDate\": \"$TODAY\",
    \"depositAmount\": $DEPOSIT_AMOUNT,
    \"bankStatementAmount\": $DEPOSIT_AMOUNT
  }"

# 4. View reconciliation results
curl -X GET "http://localhost:3000/api/era/reconciliation?batchDate=$TODAY" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

---

## TROUBLESHOOTING

### Common Issues

#### 1. Authentication Failed (401)

**Error:**
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

**Solutions:**
- Verify token is valid and not expired
- Check token is included in Authorization header
- Re-login to get new token

```bash
# Test token validity
curl -X GET http://localhost:3000/api/era/files \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -v  # verbose mode shows auth headers
```

---

#### 2. Permission Denied (403)

**Error:**
```json
{
  "success": false,
  "error": "Insufficient permissions"
}
```

**Solutions:**
- Verify user has required permissions (`era:upload`, `era:view`, etc.)
- Check role assignments
- Contact administrator

---

#### 3. Invalid 835 Format (400)

**Error:**
```json
{
  "success": false,
  "error": "Invalid 835 EDI file format"
}
```

**Solutions:**
- Verify file contains `ST*835` segment
- Check file is not corrupted
- Validate EDI structure

**Test with minimal valid file:**

```bash
curl -X POST http://localhost:3000/api/era/upload \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "test_minimal.835",
    "fileContent": "ISA*00*...*~GS*HP*...*~ST*835*...*~BPR*...*~SE*...*~GE*...*~IEA*...*~"
  }'
```

---

#### 4. File Not Found (404)

**Error:**
```json
{
  "success": false,
  "error": "ERA file not found"
}
```

**Solutions:**
- Verify file ID is correct
- Check if file was successfully uploaded
- List all files to find correct ID

```bash
# List all files to find correct ID
curl -X GET "http://localhost:3000/api/era/files?limit=100" \
  -H "Authorization: Bearer $AUTH_TOKEN" | jq '.data[].file_id'
```

---

#### 5. Server Not Running (Connection Refused)

**Error:**
```
curl: (7) Failed to connect to localhost port 3000
```

**Solutions:**
- Start the server: `npm start`
- Check server logs for errors
- Verify port 3000 is not in use

```bash
# Check if server is running
lsof -i :3000

# Start server
npm start

# Check server logs
tail -f logs/app.log
```

---

## TIPS & BEST PRACTICES

### 1. Use Environment Variables

```bash
# Set once
export AUTH_TOKEN="your_token"
export API_URL="http://localhost:3000/api"

# Use in all requests
curl -H "Authorization: Bearer $AUTH_TOKEN" "$API_URL/era/files"
```

---

### 2. Save Responses for Analysis

```bash
# Save response to file
curl -X POST "$API_URL/era/upload" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d @input.json \
  > response.json

# View formatted
cat response.json | jq '.'
```

---

### 3. Use jq for JSON Processing

```bash
# Install jq (macOS)
brew install jq

# Extract specific fields
curl -s "$API_URL/era/files" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  | jq '.data[] | {id: .file_id, name: .file_name, status: .status}'

# Count exceptions
curl -s "$API_URL/era/exceptions" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  | jq '.data | length'
```

---

### 4. Create Test Scripts

**upload-test-file.sh:**
```bash
#!/bin/bash

AUTH_TOKEN="${AUTH_TOKEN:-your_default_token}"
API_URL="${API_URL:-http://localhost:3000/api}"

curl -X POST "$API_URL/era/upload" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d @test-files/sample-835.json \
  | jq '.'
```

**Make executable:**
```bash
chmod +x upload-test-file.sh
./upload-test-file.sh
```

---

## SAMPLE TEST DATA

### Sample 835 File (Minimal)

```edi
ISA*00*          *00*          *ZZ*PAYER*ZZ*PROVIDER*250127*1200*^*00501*000000001*0*P*:~
GS*HP*PAYER*PROVIDER*20250127*1200*1*X*005010X221A1~
ST*835*0001*005010X221A1~
BPR*I*12450.00*C*ACH*CTX*01*123456789*DA*987654321*1234567890**01*987654321*20250127~
TRN*1*1234567890*1234567890~
N1*PR*TEST MEDICARE~
N1*PE*TEST HOSPICE*XX*1234567890~
CLP*TEST-001*1*12450.00*12450.00*0.00*MC*ICN001*11*1~
NM1*QC*1*DOE*JOHN****MI*ABC123~
SE*9*0001~
GE*1*1~
IEA*1*000000001~
```

### JSON Request Body

**upload-request.json:**
```json
{
  "fileName": "TEST_20250127.835",
  "fileContent": "ISA*00*          *00*          *ZZ*PAYER*ZZ*PROVIDER*250127*1200*^*00501*000000001*0*P*:~GS*HP*PAYER*PROVIDER*20250127*1200*1*X*005010X221A1~ST*835*0001*005010X221A1~BPR*I*12450.00*C*ACH*CTX*01*123456789*DA*987654321*1234567890**01*987654321*20250127~TRN*1*1234567890*1234567890~N1*PR*TEST MEDICARE~N1*PE*TEST HOSPICE*XX*1234567890~CLP*TEST-001*1*12450.00*12450.00*0.00*MC*ICN001*11*1~NM1*QC*1*DOE*JOHN****MI*ABC123~SE*9*0001~GE*1*1~IEA*1*000000001~"
}
```

**Usage:**
```bash
curl -X POST "$API_URL/era/upload" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d @upload-request.json
```

---

## RELATED DOCUMENTATION

- [PHASE3B_IMPLEMENTATION_STATUS.md](../PHASE3B_IMPLEMENTATION_STATUS.md) - Implementation details
- [PHASE3B_TEST_RESULTS.md](../PHASE3B_TEST_RESULTS.md) - Test results
- [API Routes](../src/routes/era.routes.js) - Route definitions
- [ERA Controller](../src/controllers/ERA.controller.js) - Controller implementation

---

**Document Version:** 1.0
**Last Updated:** December 27, 2025
**Maintained By:** Development Team
