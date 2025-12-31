# ERA Test Data - Sample 835 Files

## 📁 Directory Structure

```
test-data/
└── 835-samples/
    ├── medicare-routine-home-care.835          ✅ Fully paid claims
    ├── medicaid-mixed-levels.835               ✅ Different care levels
    ├── commercial-with-adjustments.835         ✅ Contractual + patient adjustments
    ├── denials-and-exceptions.835              ❌ All denied claims
    └── partial-payments-adjustments.835        ⚠️  Partial payments + unmatched
```

---

## 🎯 Sample Files Overview

### 1. Medicare - Routine Home Care ✅
**File:** `medicare-routine-home-care.835`
**Payer:** Medicare
**Total Payment:** $186.75
**Claims:** 3

| Claim ID | Patient | Amount | Status | Notes |
|----------|---------|--------|--------|-------|
| MED-RHC-001 | ANDERSON, MARY J. | $62.25 | PAID | Routine home care, 31 days |
| MED-RHC-002 | MARTINEZ, ROBERT L. | $62.25 | PAID | Routine home care, 31 days |
| MED-RHC-003 | THOMPSON, PATRICIA A. | $62.25 | PAID | Routine home care, 31 days |

**Testing Scenarios:**
- ✅ Successful auto-posting
- ✅ Medicare formatting
- ✅ Standard payment processing
- ✅ Q5001 (Routine Home Care) procedure code

---

### 2. Medicaid - Mixed Care Levels ✅
**File:** `medicaid-mixed-levels.835`
**Payer:** State Medicaid
**Total Payment:** $149.50
**Claims:** 3

| Claim ID | Patient | Care Level | Days | Amount | Status |
|----------|---------|------------|------|--------|--------|
| MCD-GIP-001 | WILLIAMS, JAMES M. | General Inpatient | 5 | $89.50 | PAID |
| MCD-CONT-001 | DAVIS, LINDA R. | Continuous Home | 3 | $30.00 | PAID |
| MCD-RHC-001 | MILLER, GEORGE T. | Routine Home | 15 | $30.00 | PAID |

**Testing Scenarios:**
- ✅ Multiple hospice care levels
- ✅ Q5004 (General Inpatient Care)
- ✅ Q5003 (Continuous Home Care)
- ✅ Q5001 (Routine Home Care)
- ✅ Medicaid formatting

---

### 3. Commercial - With Adjustments ⚖️
**File:** `commercial-with-adjustments.835`
**Payer:** Blue Cross Blue Shield
**Total Payment:** $175.50
**Claims:** 3

| Claim ID | Patient | Billed | Paid | Adjustments | Patient Resp |
|----------|---------|--------|------|-------------|--------------|
| BC-RHC-001 | BROWN, ELIZABETH K. | $62.25 | $56.00 | CO-45: $6.25 | $6.25 (PR) |
| BC-RHC-002 | TAYLOR, WILLIAM P. | $62.25 | $56.00 | CO-45: $6.25 | $0.00 |
| BC-GIP-001 | JACKSON, MARGARET L. | $89.50 | $63.50 | CO-45: $12.00 | $14.00 (PR) |

**Testing Scenarios:**
- ✅ Contractual adjustments (CO-45)
- ✅ Patient responsibility (PR)
- ✅ Commercial payer formatting
- ✅ Subscriber information (NM1*IL)
- ✅ Multiple adjustment types

**CARC Codes:**
- **CO-45:** Charge exceeds fee schedule/maximum allowable
- **PR-2:** Coinsurance amount
- **PR-3:** Copayment amount

---

### 4. Denials and Exceptions ❌
**File:** `denials-and-exceptions.835`
**Payer:** Aetna
**Total Payment:** $0.00
**Claims:** 4 (all denied)

| Claim ID | Patient | Billed | Denial Reason | CARC Code |
|----------|---------|--------|---------------|-----------|
| DENY-001 | WILSON, THOMAS R. | $62.25 | Benefit included in another service | CO-97 |
| DENY-002 | MOORE, SUSAN A. | $89.50 | Claim lacks information | CO-16 |
| DENY-003 | CLARK, RICHARD J. | $62.25 | Time limit expired | CO-29 |
| DENY-004 | RODRIGUEZ, MARIA C. | $30.00 | Non-covered service | CO-50 |

**Testing Scenarios:**
- ❌ Denial detection
- ❌ Zero payment handling
- ❌ Status code 4 (Denied) processing
- ❌ Status code 22 (Reversal) processing
- ✅ Exception creation expected
- ✅ CARC code extraction

**CARC Codes:**
- **CO-97:** Benefit included in payment of another service
- **CO-16:** Claim/service lacks information
- **CO-29:** Time limit for filing has expired
- **CO-50:** Non-covered service

---

### 5. Partial Payments & Unmatched ⚠️
**File:** `partial-payments-adjustments.835`
**Payer:** United Healthcare
**Total Payment:** $132.75
**Claims:** 3

| Claim ID | Patient | Billed | Paid | Adjustment | Patient Resp | Notes |
|----------|---------|--------|------|------------|--------------|-------|
| UHC-PART-001 | WHITE, JENNIFER L. | $62.25 | $54.00 | CO-45: $3.75 | $4.50 (PR) | Partial payment |
| UHC-PART-002 | HARRIS, CHARLES M. | $89.50 | $78.75 | CO-45: $10.75 | $0.00 | Partial payment |
| UNMATCHED-999 | NOTFOUND, PATIENT X. | $30.00 | $30.00 | None | $0.00 | ⚠️ Should create exception |

**Testing Scenarios:**
- ⚠️ Partial payment handling
- ⚠️ Exception creation (claim not found)
- ✅ Multiple adjustment types
- ✅ Contractual + patient responsibility

**Expected Results:**
- Claim 1 & 2: Should auto-post with adjustments
- Claim 3: Should create exception (CLAIM_NOT_FOUND)

---

## 🛠️ 835 File Generator

### Generate Custom Files

**Script:** `scripts/generate-835-samples.js`

### Basic Usage

```bash
# Generate Medicare file with 5 paid claims
node scripts/generate-835-samples.js --payer medicare --claims 5 --scenario paid

# Generate Medicaid file with 10 denied claims
node scripts/generate-835-samples.js --payer medicaid --claims 10 --scenario denied

# Generate Commercial file with mixed scenarios
node scripts/generate-835-samples.js --payer commercial --claims 20 --scenario mixed
```

### Options

| Option | Values | Description |
|--------|--------|-------------|
| `--payer` | medicare, medicaid, commercial | Payer type |
| `--claims` | 1-1000 | Number of claims to generate |
| `--scenario` | paid, partial, denied, mixed | Payment scenario |
| `--output` | file path | Custom output file name |

### Scenarios

**paid:** All claims fully paid (auto-post expected)
**partial:** Claims with contractual adjustments + patient responsibility
**denied:** All claims denied with various CARC codes
**mixed:** Combination of paid, partial, and denied

### Examples

**Load testing file (1000 claims):**
```bash
node scripts/generate-835-samples.js \
  --payer medicare \
  --claims 1000 \
  --scenario mixed \
  --output test-data/835-samples/load-test-1000.835
```

**Exception testing:**
```bash
node scripts/generate-835-samples.js \
  --payer commercial \
  --claims 50 \
  --scenario denied \
  --output test-data/835-samples/exceptions-test.835
```

**Reconciliation testing:**
```bash
# Generate multiple files for same date
node scripts/generate-835-samples.js --payer medicare --claims 10
node scripts/generate-835-samples.js --payer medicaid --claims 8
node scripts/generate-835-samples.js --payer commercial --claims 12
```

---

## 📊 Care Levels & Rates

### Hospice Per Diem Rates (2025)

| Code | Description | Daily Rate | Example (31 days) |
|------|-------------|------------|-------------------|
| Q5001 | Routine Home Care | $200.81 | $6,225.00 |
| Q5002 | Continuous Home Care (hourly) | $1,004.23 | N/A (hourly) |
| Q5003 | Inpatient Respite Care | $500.06 | $15,502.00 |
| Q5004 | General Inpatient Care | $1,790.00 | $8,950.00 (5 days) |
| Q5009 | Hospice Room and Board | $300.00 | $9,300.00 |

---

## 🎯 Testing Strategy

### Test Case Matrix

| File | Auto-Post Expected | Exceptions Expected | Use Case |
|------|-------------------|---------------------|----------|
| medicare-routine-home-care.835 | 3 | 0 | Happy path testing |
| medicaid-mixed-levels.835 | 3 | 0 | Multiple care levels |
| commercial-with-adjustments.835 | 3 | 0 | Adjustment handling |
| denials-and-exceptions.835 | 0 | 4 | Denial processing |
| partial-payments-adjustments.835 | 2 | 1 | Exception creation |

### Recommended Test Sequence

**1. Basic Functionality:**
```bash
# Test happy path
curl -X POST http://localhost:3000/api/era/upload \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d @test-data/835-samples/medicare-routine-home-care.835
```

**2. Multiple Care Levels:**
```bash
# Test different hospice levels
curl -X POST http://localhost:3000/api/era/upload \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d @test-data/835-samples/medicaid-mixed-levels.835
```

**3. Adjustment Processing:**
```bash
# Test CARC/RARC code handling
curl -X POST http://localhost:3000/api/era/upload \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d @test-data/835-samples/commercial-with-adjustments.835
```

**4. Exception Handling:**
```bash
# Test denial detection
curl -X POST http://localhost:3000/api/era/upload \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d @test-data/835-samples/denials-and-exceptions.835

# Verify exceptions created
curl -X GET "http://localhost:3000/api/era/exceptions?status=PENDING" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

**5. Load Testing:**
```bash
# Generate large file
node scripts/generate-835-samples.js --claims 1000 --scenario mixed

# Upload and monitor performance
time curl -X POST http://localhost:3000/api/era/upload \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d @test-data/835-samples/generated-medicare-mixed-*.835
```

---

## 📋 CARC/RARC Codes Reference

### Contractual Obligation (CO)

| Code | Description | Impact |
|------|-------------|--------|
| CO-45 | Charge exceeds fee schedule | Reduce to allowed amount |
| CO-16 | Claim lacks information | Deny/pend |
| CO-29 | Time limit expired | Deny |
| CO-50 | Non-covered service | Deny |
| CO-97 | Benefit in another service | Deny |

### Patient Responsibility (PR)

| Code | Description | Impact |
|------|-------------|--------|
| PR-1 | Deductible amount | Bill to patient |
| PR-2 | Coinsurance amount | Bill to patient |
| PR-3 | Copayment amount | Bill to patient |

---

## 🔍 File Format Validation

### Valid 835 File Checklist

✅ Contains `ISA*00*` (Interchange header)
✅ Contains `ST*835*` (Transaction set 835)
✅ Contains `BPR*` (Financial information)
✅ Contains `CLP*` (Claim payment info)
✅ Ends with `IEA*` (Interchange trailer)
✅ Proper segment terminators (`~`)
✅ Proper element separators (`*`)

### Quick Validation

```bash
# Check for required segments
grep -c "ST\*835" file.835  # Should be 1
grep -c "BPR\*" file.835     # Should be 1
grep -c "CLP\*" file.835     # Should match claim count
```

---

## 📚 Additional Resources

- [CMS 835 Implementation Guide](https://www.cms.gov/regulations-and-guidance/guidance/manuals/downloads/clm104c25.pdf)
- [CARC Code List](https://x12.org/codes/claim-adjustment-reason-codes)
- [Hospice Payment Rates](https://www.cms.gov/medicare/payment/prospective-payment-systems/hospice)

---

**Document Version:** 1.0
**Last Updated:** December 27, 2025
**Maintained By:** Development Team
