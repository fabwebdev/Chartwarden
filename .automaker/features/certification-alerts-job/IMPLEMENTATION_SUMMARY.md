# Certification Alerts Job - Implementation Summary

**Feature ID:** certification-alerts-job
**Status:** ✅ Completed
**Date Completed:** 2026-01-02

## Overview

This feature implements an automated system to monitor certification expiration dates and send timely alerts using node-cron. The system prevents missed certifications and face-to-face requirements by proactively alerting clinical staff.

## Implementation Details

### 1. Job Modules

#### `services/api/src/jobs/certificationAlerts.job.js`

Two main scheduled functions:

- **`processCertificationAlerts()`** - Hourly execution (0 * * * *)
  - Queries pending alerts from `certification_alerts` table
  - Sends email notifications via MailService
  - Updates alert status (PENDING → SENT/FAILED)
  - Tracks success/failure counts
  - Returns execution summary

- **`checkOverdueCertifications()`** - Daily at 8:00 AM (0 8 * * *)
  - Queries certifications with status PENDING and due date <= today
  - Creates OVERDUE_CERT alerts with CRITICAL priority
  - Prevents duplicate alerts by checking existing alerts
  - Returns count of overdue certifications and alerts created

#### Helper Functions:
- `buildAlertMessage()` - Generates plain text email content
- `buildAlertHtml()` - Generates HTML email content with priority-colored headers

### 2. Scheduler System

#### `services/api/src/jobs/scheduler.js`

**JobScheduler Class** manages all cron jobs:

- **`init()`** - Initializes all scheduled jobs with timezone support
- **`stop()`** - Gracefully stops all running jobs
- **`runJob(jobName)`** - Manually executes specific jobs for testing/admin purposes

**Registered Certification Jobs:**
- `certification-alerts` - Triggers `processCertificationAlerts()`
- `overdue-certifications` - Triggers `checkOverdueCertifications()`

**Configuration:**
- Timezone: `process.env.TZ || 'America/New_York'`
- Enabled via: `ENABLE_SCHEDULER=true` environment variable

### 3. Database Schema

#### `certification_alerts` table

Defined in `services/api/src/db/schemas/capTracking.schema.js`:

```javascript
{
  id: bigint (primary key, auto-increment),
  certification_id: bigint (references certifications),
  patient_id: bigint (references patients),

  // Alert details
  alert_type: varchar(50), // UPCOMING_CERT, OVERDUE_CERT, F2F_REQUIRED, F2F_OVERDUE
  alert_priority: varchar(50), // NORMAL, HIGH, CRITICAL

  // Timing
  scheduled_for: timestamp,
  sent_at: timestamp,
  alert_status: varchar(50), // PENDING, SENT, FAILED, DISMISSED

  // Recipients and content
  recipients: jsonb, // Array of email addresses
  subject: varchar(255),
  message: text,
  metadata: jsonb,

  // Audit fields
  created_by_id: text (references users),
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### 4. Admin API Routes

#### `services/api/src/routes/jobs.routes.js` (NEW)

Admin-only endpoints for job management:

- **`GET /api/jobs/status`**
  - Requires: `MANAGE_SETTINGS` permission
  - Returns: Scheduler status, available jobs, timezone
  - Response:
    ```json
    {
      "success": true,
      "data": {
        "scheduler_enabled": true,
        "available_jobs": ["cap-recalculation", "certification-alerts", ...],
        "timezone": "America/New_York"
      }
    }
    ```

- **`POST /api/jobs/:jobName/run`**
  - Requires: `MANAGE_SETTINGS` permission
  - Params: `jobName` (e.g., "certification-alerts")
  - Manually triggers specified job
  - Logs user action in audit trail
  - Returns: Execution result with timestamp

#### Route Registration

Updated `services/api/src/routes/api.routes.js`:
```javascript
import jobsRoutes from "./jobs.routes.js";
// ...
await fastify.register(jobsRoutes); // Background Jobs Management
```

### 5. Email Integration

Uses existing **MailService** (`services/api/src/services/MailService.js`):

- Sends both plain text and HTML emails
- Priority-based color coding (CRITICAL=red, HIGH=orange, NORMAL=blue)
- Includes patient information (name, MRN)
- Includes certification details (period, start date, due date)
- Customizable message based on alert type

### 6. Server Integration

#### `services/api/server.js`

Scheduler initialization on server start:
```javascript
import JobScheduler from "./src/jobs/scheduler.js";

// ...

// On server ready
if (process.env.ENABLE_SCHEDULER === 'true') {
  JobScheduler.init();
} else {
  info("Job scheduler disabled (set ENABLE_SCHEDULER=true to enable)");
}

// On graceful shutdown
JobScheduler.stop();
```

## Configuration

### Environment Variables

Required in `.env` (documented in `.env.example`):

```bash
# Enable/disable job scheduler
ENABLE_SCHEDULER=true

# Default email for certification alerts
CERTIFICATION_ALERT_EMAIL=clinical@example.com

# Optional: Override default timezone
TZ=America/New_York
```

## Alert Types

| Alert Type | Priority | Trigger | Description |
|------------|----------|---------|-------------|
| UPCOMING_CERT | NORMAL/HIGH | 5 days before | Certification due within 2 days of benefit period start |
| OVERDUE_CERT | CRITICAL | Daily at 8 AM | Certification past due date |
| F2F_REQUIRED | HIGH | 30 days before recert | Face-to-face required for 3rd+ benefit period |
| F2F_OVERDUE | CRITICAL | After F2F due date | Face-to-face encounter overdue |

## Job Schedules

| Job Name | Schedule | Cron Expression | Description |
|----------|----------|-----------------|-------------|
| processCertificationAlerts | Hourly | `0 * * * *` | Process and send pending alerts |
| checkOverdueCertifications | Daily 8 AM | `0 8 * * *` | Create alerts for overdue certifications |

## Data Flow

1. **Alert Creation** (External process or manual)
   - Creates records in `certification_alerts` table
   - Sets `alert_status = 'PENDING'`
   - Sets `scheduled_for` timestamp

2. **Hourly Processing** (`processCertificationAlerts`)
   - Queries alerts where `alert_status = 'PENDING'` AND `scheduled_for <= NOW()`
   - For each alert:
     - Fetches related certification and patient data
     - Builds email content (text + HTML)
     - Sends email via MailService
     - Updates `alert_status` to 'SENT' or 'FAILED'
     - Logs to system logger

3. **Daily Overdue Check** (`checkOverdueCertifications`)
   - Queries certifications where `status = 'PENDING'` AND `due_date <= TODAY`
   - For each overdue certification:
     - Checks if OVERDUE_CERT alert already exists
     - If not, creates new alert with CRITICAL priority
     - Schedules for immediate processing

## Error Handling

- **Job Failure:** Logged but does not crash server
- **Email Send Failure:** Alert marked as FAILED with error metadata
- **Database Errors:** Caught and logged, job continues processing remaining alerts
- **Invalid Job Names:** API returns 400 with error message

## Monitoring & Logging

All job executions log:
- Start time
- Completion time
- Success/failure counts
- Error details (if any)
- User ID (for manual triggers)

Log levels:
- `INFO`: Normal execution, start/complete messages
- `ERROR`: Job failures, email send failures, database errors

## Verification Results

✅ All verification tests passed:
- Job modules load correctly
- Scheduler is properly configured
- Database schemas are exported
- API routes are registered
- Environment variables are documented
- Jobs are registered in scheduler

## Files Modified/Created

### Created:
- `services/api/src/routes/jobs.routes.js` (Admin API endpoints)

### Modified:
- `services/api/src/routes/api.routes.js` (Route registration)
- `.automaker/features/certification-alerts-job/feature.json` (Status update)

### Existing (Verified):
- `services/api/src/jobs/certificationAlerts.job.js` (Job implementation)
- `services/api/src/jobs/scheduler.js` (Scheduler system)
- `services/api/src/db/schemas/capTracking.schema.js` (Database schema)
- `services/api/server.js` (Server integration)

## Usage Instructions

### Enable Scheduler

1. Copy `.env.example` to `.env` (if not already done)
2. Set environment variables:
   ```bash
   ENABLE_SCHEDULER=true
   CERTIFICATION_ALERT_EMAIL=your-email@example.com
   TZ=America/New_York  # Optional
   ```
3. Start the API server:
   ```bash
   npm run dev:api
   ```

### Manual Job Trigger (Testing)

Requires authentication and `MANAGE_SETTINGS` permission:

```bash
# Get job status
curl -X GET http://localhost:3001/api/jobs/status \
  -H "Authorization: Bearer YOUR_TOKEN"

# Trigger certification alerts job manually
curl -X POST http://localhost:3001/api/jobs/certification-alerts/run \
  -H "Authorization: Bearer YOUR_TOKEN"

# Trigger overdue certification check
curl -X POST http://localhost:3001/api/jobs/overdue-certifications/run \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Compliance Notes

- **HIPAA:** Audit logging captures all alert processing and manual triggers
- **CMS Requirements:** Ensures timely physician certification per 42 CFR §418.22
- **Face-to-Face:** Alerts for F2F requirements per 42 CFR §418.22(a)(4)

## Future Enhancements

Potential improvements (not in current scope):

1. **Distributed Locking:** Use Redis locks for multi-instance deployments
2. **Job Queue:** Migrate to Bull/BullMQ for better reliability and monitoring
3. **Retry Logic:** Automatic retry for failed email sends
4. **Alert Preferences:** Per-user notification preferences
5. **SMS Alerts:** Additional notification channel via Twilio
6. **Webhook Integration:** Notify external systems
7. **Alert Dismissal:** API endpoint to dismiss alerts
8. **Holiday Calendar:** Skip weekends/holidays option
9. **Rate Limiting:** Prevent email flooding
10. **Delivery Tracking:** Monitor bounce rates and delivery status

## Support

For issues or questions:
- Check logs: `services/api/logs/`
- Review environment variables
- Verify database schema exists
- Ensure MailService is configured

---

**Implementation Verified:** 2026-01-02
**Verification Method:** Module loading tests, syntax validation, route registration check
**All Tests:** ✅ PASSED
