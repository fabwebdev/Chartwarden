# Phase 3B Quick Start Guide
## ERA Processing & Auto-Posting in 5 Minutes

**Goal:** Upload your first 835 file and see automated payment posting in action.

---

## Prerequisites ✅

- [ ] Server running (`npm start`)
- [ ] Valid authentication token
- [ ] Sample 835 file or use provided samples

---

## Step 1: Start the Server (1 min)

```bash
# Navigate to project directory
cd /path/to/ehr_backend-main

# Start the server
npm start

# Verify server is running
curl http://localhost:3000/api/health
```

**Expected output:**
```json
{
  "status": "healthy",
  "database": "connected"
}
```

---

## Step 2: Get Authentication Token (1 min)

```bash
# Login (replace with your credentials)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "yourpassword"
  }'
```

**Copy the token from response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Set as environment variable:**
```bash
export AUTH_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Step 3: Upload Sample 835 File (2 min)

**Option A: Use pre-built sample**

```bash
# Upload Medicare sample (3 claims, all paid)
curl -X POST http://localhost:3000/api/era/upload \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d @test-data/835-samples/medicare-routine-home-care.835
```

**Option B: Generate custom file**

```bash
# Generate file with 10 claims
node scripts/generate-835-samples.js --claims 10

# Upload generated file
curl -X POST http://localhost:3000/api/era/upload \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d @test-data/835-samples/generated-*.835
```

---

## Step 4: View Results (1 min)

**Check uploaded files:**
```bash
curl -X GET "http://localhost:3000/api/era/files" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

**Check for exceptions:**
```bash
curl -X GET "http://localhost:3000/api/era/exceptions?status=PENDING" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

**View payment postings:**
```bash
# Get file ID from previous response, then:
curl -X GET "http://localhost:3000/api/era/payments/FILE_ID" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

---

## What Just Happened? 🎉

1. **File Parsed:** 835 EDI file was parsed into structured data
2. **Claims Matched:** Each payment was matched to database claims
3. **Auto-Posted:** Payments with >95% confidence were posted automatically
4. **Exceptions Created:** Unmatched or low-confidence payments flagged for review
5. **Balances Updated:** Claim balances were updated with payments

---

## Next Steps

### Explore More Features

**1. Test with different scenarios:**
```bash
# Upload file with denials
curl -X POST http://localhost:3000/api/era/upload \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d @test-data/835-samples/denials-and-exceptions.835

# Upload file with adjustments
curl -X POST http://localhost:3000/api/era/upload \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d @test-data/835-samples/commercial-with-adjustments.835
```

**2. Resolve exceptions:**
```bash
# Get exception ID from exceptions list
EXCEPTION_ID="exc_abc123"

curl -X POST "http://localhost:3000/api/era/resolve-exception/$EXCEPTION_ID" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "resolutionType": "MANUAL_POSTED",
    "notes": "Manually verified and posted"
  }'
```

**3. Run reconciliation:**
```bash
curl -X POST "http://localhost:3000/api/era/reconcile-batch" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "batchDate": "2025-01-27",
    "depositAmount": 18675000,
    "bankStatementAmount": 18675000
  }'
```

---

## Using Postman Instead

**1. Import collection:**
- Open Postman
- Import `postman/ERA_API_Tests.postman_collection.json`

**2. Set variables:**
- `base_url`: `http://localhost:3000/api`
- `auth_token`: Your JWT token

**3. Run requests:**
- Start with "Upload 835 ERA File"
- Explore other endpoints

---

## Common Tasks

### Upload Multiple Files

```bash
# Loop through all samples
for file in test-data/835-samples/*.835; do
  echo "Uploading: $file"
  curl -X POST http://localhost:3000/api/era/upload \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -d @"$file"
done
```

### Generate Large Test File

```bash
# Generate 1000 claims for load testing
node scripts/generate-835-samples.js --claims 1000 --scenario mixed
```

### Run Automated Tests

```bash
# Test all endpoints
node scripts/test-era-api.js
```

---

## Troubleshooting

**Server not running:**
```bash
npm start
```

**Authentication failed:**
```bash
# Get new token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'
```

**Invalid 835 format:**
- Verify file contains `ST*835`
- Check file is not corrupted
- Use provided samples to test

---

## Learn More

- **Full Documentation:** [docs/phase3b/README.md](../README.md)
- **API Reference:** [implementation/03-api-reference.md](../implementation/03-api-reference.md)
- **Test Guide:** [testing/02-api-testing-guide.md](../testing/02-api-testing-guide.md)
- **Troubleshooting:** [guides/troubleshooting.md](troubleshooting.md)

---

**You're ready to go! 🚀**

Start uploading 835 files and let the automated payment posting do its magic.
