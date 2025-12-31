# Phase 3B Troubleshooting Guide
## Common Issues & Solutions

**Quick Reference:** Find solutions to common ERA processing issues.

---

## 🔍 QUICK DIAGNOSIS

### Is the server running?
```bash
curl http://localhost:3000/api/health
```
✅ Healthy: Continue
❌ Error: See [Server Issues](#server-issues)

### Can you authenticate?
```bash
curl -H "Authorization: Bearer $AUTH_TOKEN" \
  http://localhost:3000/api/era/files
```
✅ 200 OK: Continue
❌ 401: See [Authentication Issues](#authentication-issues)

### Is the database connected?
```bash
curl http://localhost:3000/api/health | grep database
```
✅ "connected": Continue
❌ "disconnected": See [Database Issues](#database-issues)

---

## 🚨 COMMON ISSUES

### 1. Authentication Issues

#### Error: "Unauthorized" (401)

**Symptoms:**
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

**Causes:**
- Token not provided
- Token expired
- Token invalid

**Solutions:**

**A. Get new token:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com",
    "password": "yourpassword"
  }'
```

**B. Verify token format:**
```bash
# Token should start with "eyJ..."
echo $AUTH_TOKEN | head -c 10
```

**C. Check token in request:**
```bash
curl -v http://localhost:3000/api/era/files \
  -H "Authorization: Bearer $AUTH_TOKEN" 2>&1 | grep Authorization
```

---

#### Error: "Insufficient permissions" (403)

**Symptoms:**
```json
{
  "success": false,
  "error": "Forbidden - Insufficient permissions"
}
```

**Causes:**
- User lacks required permission
- Role not assigned

**Solutions:**

**A. Check required permissions:**
- `era:upload` - Upload files
- `era:view` - View data
- `era:post` - Manual posting
- `era:resolve` - Resolve exceptions
- `era:reconcile` - Run reconciliation

**B. Contact administrator to assign permissions**

**C. Verify your permissions:**
```bash
curl -H "Authorization: Bearer $AUTH_TOKEN" \
  http://localhost:3000/api/user/me
```

---

### 2. File Upload Issues

#### Error: "Invalid 835 EDI file format" (400)

**Symptoms:**
```json
{
  "success": false,
  "error": "Invalid 835 EDI file format"
}
```

**Causes:**
- File missing `ST*835` segment
- File corrupted
- Wrong file type

**Solutions:**

**A. Validate file structure:**
```bash
# File should contain ST*835
grep "ST\*835" yourfile.835
```

**B. Check file has minimum segments:**
```bash
# Should have ISA, GS, ST, BPR, CLP, SE, GE, IEA
for seg in ISA GS ST BPR CLP SE GE IEA; do
  echo -n "$seg: "
  grep -c "$seg\*" yourfile.835
done
```

**C. Use sample file to test:**
```bash
curl -X POST http://localhost:3000/api/era/upload \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d @test-data/835-samples/medicare-routine-home-care.835
```

---

#### Error: "Parsing failed" (500)

**Symptoms:**
- File uploads but parsing fails
- Error in response about specific segment

**Solutions:**

**A. Test parser directly:**
```bash
node scripts/test-era-simple.js
```

**B. Check for special characters:**
```bash
# File should use *~ delimiters
cat yourfile.835 | tr '~' '\n' | head
```

**C. Validate segment structure:**
```bash
# All segments should end with ~
grep -v '~$' yourfile.835
```

---

### 3. Claim Matching Issues

#### No claims auto-posted (all exceptions)

**Symptoms:**
- File uploads successfully
- All payments create exceptions
- Exception type: CLAIM_NOT_FOUND

**Causes:**
- Claims not in database
- Patient account numbers don't match
- Claims in wrong status

**Solutions:**

**A. Check if claims exist:**
```bash
# Search for claim by patient account number
curl -X GET "http://localhost:3000/api/claims?account=TEST-001" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

**B. Verify account numbers in 835:**
```bash
# Extract patient account numbers from file
grep "CLP\*" yourfile.835 | cut -d'*' -f2
```

**C. Check claim status:**
```sql
-- Claims must be in SUBMITTED, ACCEPTED, or PENDING status
-- Not PAID or CLOSED
SELECT id, patient_account_number, status
FROM claims
WHERE patient_account_number IN ('TEST-001', 'TEST-002');
```

**D. Create test claims:**
```bash
# Use the test data creation script
node scripts/create-test-claims.js
```

---

#### Low confidence matches

**Symptoms:**
- Exception type: LOW_CONFIDENCE_MATCH
- Match confidence < 95%

**Causes:**
- Patient account number mismatch
- Amount mismatch
- Date mismatch

**Solutions:**

**A. Review exception details:**
```bash
curl -X GET "http://localhost:3000/api/era/exceptions" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

**B. Check matching criteria:**
- Patient account number (100% confidence)
- Internal claim ID (98% confidence)
- Fuzzy match (variable confidence)

**C. Manually resolve exception:**
```bash
curl -X POST "http://localhost:3000/api/era/resolve-exception/EXC_ID" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "resolutionType": "MANUAL_POSTED",
    "notes": "Verified match manually"
  }'
```

---

### 4. Database Issues

#### Error: "Database connection failed"

**Symptoms:**
```json
{
  "status": "unhealthy",
  "database": "disconnected"
}
```

**Solutions:**

**A. Check DATABASE_URL:**
```bash
echo $DATABASE_URL
# Should be: postgresql://user:pass@host:port/dbname
```

**B. Test database connection:**
```bash
psql $DATABASE_URL -c "SELECT 1;"
```

**C. Restart database:**
```bash
# If using Docker
docker-compose restart postgres

# If using systemd
sudo systemctl restart postgresql
```

**D. Check database logs:**
```bash
tail -f /var/log/postgresql/postgresql-*.log
```

---

#### Error: "Table does not exist"

**Symptoms:**
```
relation "era_files" does not exist
```

**Solutions:**

**A. Check migrations:**
```bash
ls database/migrations/drizzle/ | grep 0014
# Should see: 0014_add_phase3_eligibility_era.sql
```

**B. Run migrations:**
```bash
npm run migrate:run
```

**C. Verify tables created:**
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'era_%';
```

---

### 5. Performance Issues

#### Slow file processing

**Symptoms:**
- Large files (1000+ claims) take > 30 seconds
- Server becomes unresponsive

**Solutions:**

**A. Check file size:**
```bash
wc -l yourfile.835
# Count claims
grep -c "CLP\*" yourfile.835
```

**B. Process in batches:**
```bash
# Split large file into smaller ones
split -l 1000 largefile.835 batch-
```

**C. Increase timeout:**
```javascript
// In test script
axios.defaults.timeout = 120000; // 2 minutes
```

**D. Monitor memory:**
```bash
# During processing
top -p $(pgrep -f node)
```

---

#### High exception rate

**Symptoms:**
- > 50% of payments become exceptions
- Auto-post rate < 50%

**Solutions:**

**A. Analyze exception types:**
```bash
curl -X GET "http://localhost:3000/api/era/exceptions" \
  -H "Authorization: Bearer $AUTH_TOKEN" | \
  jq '.data | group_by(.exception_type) | map({type: .[0].exception_type, count: length})'
```

**B. Check matching threshold:**
```javascript
// In PaymentPosting.service.js
this.matchingThreshold = 0.95; // Lower if too strict
```

**C. Verify claim data quality:**
```sql
-- Check for missing patient account numbers
SELECT COUNT(*)
FROM claims
WHERE patient_account_number IS NULL
OR patient_account_number = '';
```

---

### 6. Exception Handling Issues

#### Can't resolve exception

**Symptoms:**
- Exception resolution returns 404
- Exception ID not found

**Solutions:**

**A. Verify exception ID:**
```bash
curl -X GET "http://localhost:3000/api/era/exceptions" \
  -H "Authorization: Bearer $AUTH_TOKEN" | \
  jq '.data[].exception_id'
```

**B. Check exception status:**
```bash
# Can only resolve PENDING or ASSIGNED exceptions
curl -X GET "http://localhost:3000/api/era/exceptions?status=PENDING" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

**C. Use correct resolution type:**
```bash
# Valid types: MANUAL_POSTED, CLAIM_CORRECTED,
#             PAYER_CONTACTED, WRITTEN_OFF, REFUNDED
```

---

### 7. Reconciliation Issues

#### Variance in reconciliation

**Symptoms:**
- Bank amount ≠ ERA amount
- Reconciliation shows variance

**Solutions:**

**A. Check all ERA files for date:**
```bash
curl -X GET "http://localhost:3000/api/era/files?date=2025-01-27" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

**B. Sum ERA payments:**
```sql
SELECT
  production_date,
  SUM(total_amount) as total_era,
  COUNT(*) as file_count
FROM era_files
WHERE production_date = '2025-01-27'
GROUP BY production_date;
```

**C. Check for missing deposits:**
```bash
# Compare with bank statement
# Look for timing differences (deposits in transit)
```

---

## 🛠️ DIAGNOSTIC TOOLS

### Enable Debug Logging

```bash
# Set log level
export LOG_LEVEL=debug

# Restart server
npm start
```

### Check Application Logs

```bash
# Real-time logs
tail -f logs/application.log

# Error logs only
grep ERROR logs/application.log

# Today's errors
grep "$(date +%Y-%m-%d)" logs/application.log | grep ERROR
```

### Database Query Examples

**List recent ERA files:**
```sql
SELECT
  file_id,
  file_name,
  status,
  total_claims,
  auto_posted_count,
  exception_count,
  received_date
FROM era_files
ORDER BY received_date DESC
LIMIT 10;
```

**Find problem exceptions:**
```sql
SELECT
  exception_id,
  exception_type,
  exception_severity,
  patient_account_number,
  sla_deadline,
  is_overdue
FROM posting_exceptions
WHERE status = 'PENDING'
AND is_overdue = true
ORDER BY sla_deadline;
```

**Check auto-post rate:**
```sql
SELECT
  COUNT(*) FILTER (WHERE posting_status = 'AUTO_POSTED') as auto_posted,
  COUNT(*) FILTER (WHERE is_exception = true) as exceptions,
  COUNT(*) as total,
  ROUND(100.0 * COUNT(*) FILTER (WHERE posting_status = 'AUTO_POSTED') / COUNT(*), 2) as auto_post_rate
FROM era_payments
WHERE created_at > NOW() - INTERVAL '7 days';
```

---

## 📞 ESCALATION

### When to Escalate

❌ **Don't escalate:**
- Authentication issues (get new token)
- Invalid file format (fix file)
- Missing claims (create claims first)

⚠️ **Consider escalating:**
- Parser crashes repeatedly
- Database connection keeps failing
- Auto-post rate suddenly drops

🚨 **Immediately escalate:**
- Data corruption
- Security breach
- System completely down

### Escalation Contacts

**Level 1 - Documentation:**
- Check this troubleshooting guide
- Review [API Testing Guide](../testing/02-api-testing-guide.md)
- Check [Implementation Status](../implementation/01-implementation-status.md)

**Level 2 - Development Team:**
- File GitHub issue with details
- Include error messages
- Include steps to reproduce

**Level 3 - Operations:**
- Critical production issues
- After-hours emergencies
- Security incidents

---

## 📋 DIAGNOSTIC CHECKLIST

When reporting issues, include:

- [ ] Error message (full text)
- [ ] Steps to reproduce
- [ ] Sample 835 file (sanitized)
- [ ] Server logs (relevant portion)
- [ ] Database state (if applicable)
- [ ] Environment (dev/staging/prod)
- [ ] Node version (`node --version`)
- [ ] npm version (`npm --version`)

---

## 🔧 PREVENTIVE MEASURES

### Regular Maintenance

**Weekly:**
- [ ] Review exception queue
- [ ] Check auto-post rates
- [ ] Monitor error logs
- [ ] Verify reconciliation

**Monthly:**
- [ ] Database performance review
- [ ] Update npm packages
- [ ] Security audit
- [ ] Backup verification

**Quarterly:**
- [ ] Load testing
- [ ] Disaster recovery test
- [ ] Documentation review
- [ ] Training refresh

---

## 📚 ADDITIONAL RESOURCES

- **Quick Start:** [guides/quick-start.md](quick-start.md)
- **API Reference:** [implementation/03-api-reference.md](../implementation/03-api-reference.md)
- **Test Guide:** [testing/02-api-testing-guide.md](../testing/02-api-testing-guide.md)
- **Production Checklist:** [guides/production-checklist.md](production-checklist.md)

---

**Last Updated:** December 27, 2025
**Maintained By:** Development Team
