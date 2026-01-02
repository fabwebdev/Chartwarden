# Admin Settings Page Implementation

## Overview

Complete implementation of an admin-only settings page for system-wide configuration management with clearinghouse integration settings.

## Feature ID
`system-settings-ui`

## Implementation Date
January 2, 2026

## Status
✅ **COMPLETE AND VERIFIED**

---

## Architecture

### Backend Components

#### Database Schema
- **Tables Created:**
  - `admin_settings` - Stores all system settings with metadata
  - `admin_settings_history` - HIPAA-compliant audit trail of all changes

- **Migration File:**
  - `services/api/database/migrations/drizzle/0042_admin_settings.sql`

- **Schema Definition:**
  - `services/api/src/db/schemas/adminSettings.schema.js`
  - Exported in `services/api/src/db/schemas/index.js`

#### Controller
- **File:** `services/api/src/controllers/SystemSettings.controller.js`
- **Features:**
  - List settings grouped by category
  - Get/Update individual settings
  - Bulk update multiple settings
  - Reset settings to default values
  - Initialize default settings
  - Test clearinghouse connections
  - Settings change history retrieval
  - AES-256-CBC encryption for sensitive values
  - Client-side masking of sensitive data
  - Comprehensive validation (INTEGER, BOOLEAN, URL, EMAIL, SELECT, JSON)

#### Routes
- **File:** `services/api/src/routes/adminSettings.routes.js`
- **Registered In:** `services/api/src/routes/api.routes.js`
- **Middleware:** `requireAdmin` - All endpoints require admin role

#### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/settings` | List all settings by category |
| GET | `/api/admin/settings/:key` | Get individual setting |
| PUT | `/api/admin/settings/:key` | Update setting |
| POST | `/api/admin/settings/bulk` | Bulk update settings |
| POST | `/api/admin/settings/initialize` | Initialize default settings |
| POST | `/api/admin/settings/reset/:key` | Reset to default |
| POST | `/api/admin/settings/clearinghouse/test` | Test connection |
| GET | `/api/admin/settings/history` | Get change history |

### Frontend Components

#### Page
- **File:** `apps/web/src/app/(dashboard)/admin/settings/page.tsx`
- **Route:** `/admin/settings`
- **Access:** Admin role required

#### View Component
- **File:** `apps/web/src/views/admin-settings-view/AdminSettingsPage.tsx`
- **Features:**
  - Tabbed interface for setting categories
  - Dynamic form inputs based on setting type
  - Real-time validation
  - Unsaved changes warning
  - Confirmation dialogs for critical changes
  - Password visibility toggle
  - Clearinghouse connection testing
  - Success/error notifications (SweetAlert2)
  - Responsive Material-UI design

---

## Setting Categories

### 1. System Configuration (SYSTEM)
- **Timezone** - System-wide timezone setting (SELECT)
- **Date Format** - Display format for dates (SELECT)
- **Maintenance Mode** - Enable/disable maintenance mode (BOOLEAN)

### 2. Security Settings (SECURITY)
- **Session Timeout** - Minutes before session expires (INTEGER, min: 5, max: 480)
- **Max Login Attempts** - Failed attempts before lockout (INTEGER, min: 3, max: 10)
- **Password Expiry Days** - Days before password change required (INTEGER, min: 0, max: 365)

### 3. Clearinghouse Settings (CLEARINGHOUSE)
- **Enable Integration** - Toggle clearinghouse integration (BOOLEAN)
- **API Endpoint** - Clearinghouse API URL (URL)
- **Username** - API authentication username (STRING)
- **Password** - API authentication password (ENCRYPTED)
- **Sync Frequency** - Sync interval in minutes (SELECT)
- **Connection Timeout** - API timeout in seconds (INTEGER, min: 5, max: 120)

---

## Security Features

### Authentication & Authorization
- ✅ All endpoints require authentication (Better Auth)
- ✅ Admin role required for all operations
- ✅ `MANAGE_SETTINGS` permission added to RBAC config
- ✅ Frontend checks user role before rendering
- ✅ Auto-redirect for unauthorized users

### Data Protection
- ✅ Sensitive values encrypted with AES-256-CBC
- ✅ Encrypted values never exposed via API
- ✅ Masked values shown in UI (e.g., `****word`)
- ✅ Password inputs with visibility toggle
- ✅ Environment-based encryption key support

### Audit Trail
- ✅ All changes logged to `admin_settings_history`
- ✅ Captures: user ID, IP address, user agent, session ID
- ✅ Records previous and new values
- ✅ Supports change reason notes
- ✅ HIPAA-compliant logging

---

## Validation Rules

### Type-Based Validation
- **INTEGER**: Min/max range validation
- **BOOLEAN**: Must be `true` or `false`
- **URL**: Valid URL format required
- **EMAIL**: Valid email format required
- **SELECT**: Value must be in allowed options
- **JSON**: Valid JSON structure required
- **ENCRYPTED**: Encrypted on save, masked on read

### Setting-Specific Rules
- Defined in `validation_rules` JSONB field
- Supports: `min`, `max`, `pattern`, `required`
- Enforced server-side before saving
- Client-side validation for instant feedback

---

## User Experience Features

### Unsaved Changes Protection
- ✅ Detects form modifications
- ✅ Browser warning before navigation
- ✅ Visual indicator for modified settings
- ✅ "Save Changes" button disabled when no changes

### Confirmation Dialogs
- ✅ Maintenance mode toggle confirmation
- ✅ Reset to default confirmation
- ✅ Destructive action warnings

### Connection Testing
- ✅ Test clearinghouse API without saving
- ✅ Shows response time and reachability
- ✅ Displays detailed error messages
- ✅ Validates credentials separately

### Visual Feedback
- ✅ Loading states for async operations
- ✅ Success/error notifications
- ✅ "Modified" chips on changed settings
- ✅ "Restart Required" warnings
- ✅ Category icons for visual scanning

---

## Database Structure

### admin_settings Table
```sql
- id (BIGINT, PRIMARY KEY)
- setting_key (VARCHAR, UNIQUE) - e.g., "system.timezone"
- name (VARCHAR) - Display name
- description (TEXT) - Help text
- setting_value (TEXT) - Current value
- default_value (TEXT) - Default value
- setting_type (VARCHAR) - STRING, INTEGER, BOOLEAN, URL, etc.
- category (VARCHAR) - SYSTEM, SECURITY, CLEARINGHOUSE
- options (JSONB) - For SELECT type
- validation_rules (JSONB) - Min, max, pattern, etc.
- display_order (INTEGER) - Sort order in category
- is_sensitive (BOOLEAN) - Mask in UI
- requires_restart (BOOLEAN) - App restart needed
- is_readonly (BOOLEAN) - Cannot be edited
- metadata (JSONB) - Additional data
- created_by_id, updated_by_id (TEXT)
- created_at, updated_at (TIMESTAMP)
```

### admin_settings_history Table
```sql
- id (BIGINT, PRIMARY KEY)
- setting_id (BIGINT, FK)
- setting_key (VARCHAR)
- previous_value (TEXT)
- new_value (TEXT)
- change_reason (TEXT)
- ip_address (VARCHAR)
- user_agent (TEXT)
- session_id (VARCHAR)
- changed_by_id (TEXT, FK)
- changed_at (TIMESTAMP)
```

---

## Testing & Verification

### API Testing
✅ All 8 endpoints verified:
- Authentication/Authorization checks
- Settings initialization
- List/Filter by category
- Individual setting CRUD
- Bulk updates
- Validation (INTEGER, URL)
- Clearinghouse connection test
- History retrieval

### Implementation Verification
✅ All files created and in place:
- Backend schema, controller, routes
- Frontend page and view component
- Database migration applied
- RBAC permission configured
- Routes registered

### Database Verification
✅ Tables created successfully:
- `admin_settings` with all columns and indexes
- `admin_settings_history` with audit fields
- Foreign key constraints working
- Indexes created for performance

---

## Usage Instructions

### First-Time Setup

1. **Start the application:**
   ```bash
   docker-compose up -d
   npm run dev
   ```

2. **Initialize default settings:**
   ```bash
   curl -X POST http://localhost:3001/api/admin/settings/initialize \
     -H "Cookie: <admin-session-cookie>"
   ```

   Or navigate to `/admin/settings` as an admin user - the UI will prompt initialization.

3. **Configure settings via UI:**
   - Navigate to `/admin/settings`
   - Select category tab
   - Modify settings as needed
   - Click "Save Changes"

### Environment Variables

Set in `.env` for production:
```bash
SETTINGS_ENCRYPTION_KEY=your-32-character-encryption-key-here
```

### Accessing Settings in Code

```javascript
// Backend - Get setting value
import { db } from '../db/index.js';
import { admin_settings } from '../db/schemas/adminSettings.schema.js';
import { eq } from 'drizzle-orm';

const [setting] = await db
  .select()
  .from(admin_settings)
  .where(eq(admin_settings.setting_key, 'system.timezone'))
  .limit(1);

const timezone = setting.setting_value; // e.g., "America/New_York"
```

---

## Compliance & Best Practices

### HIPAA Compliance
✅ Complete audit trail in `admin_settings_history`
✅ IP address and user agent logging
✅ Session ID tracking
✅ Encrypted sensitive credentials
✅ Access control via RBAC

### Security Best Practices
✅ Admin-only access
✅ CSRF protection (via Better Auth)
✅ Input validation (XSS/SQL injection prevention)
✅ Rate limiting ready (implement as needed)
✅ Encrypted storage for sensitive data

### Code Quality
✅ Type-safe with TypeScript (frontend)
✅ Drizzle ORM for SQL safety
✅ Comprehensive error handling
✅ Consistent naming conventions
✅ Well-documented code

---

## Known Limitations

1. **Encryption Key:** Default development key used if `SETTINGS_ENCRYPTION_KEY` not set
2. **Restart Required:** Some settings require application restart (flagged in UI)
3. **Connection Test:** Basic HTTP check - may need enhancement for specific clearinghouse APIs
4. **Pagination:** Settings history supports pagination but UI shows limited entries

---

## Future Enhancements

- [ ] Export/Import settings as JSON
- [ ] Setting templates for different environments
- [ ] Advanced clearinghouse integration testing
- [ ] Real-time settings sync across server instances
- [ ] Setting change notifications
- [ ] Bulk reset to defaults
- [ ] Setting search/filter in UI
- [ ] Setting groups/sections within categories

---

## Files Modified

### Backend
- `services/api/src/db/schemas/index.js` - Added schema export
- `services/api/src/config/rbac.js` - Added MANAGE_SETTINGS permission
- `services/api/src/routes/api.routes.js` - Registered routes

### Frontend
- None (only new files created)

---

## Files Created

### Backend
- `services/api/src/db/schemas/adminSettings.schema.js`
- `services/api/src/controllers/SystemSettings.controller.js`
- `services/api/src/routes/adminSettings.routes.js`
- `services/api/database/migrations/drizzle/0042_admin_settings.sql`

### Frontend
- `apps/web/src/app/(dashboard)/admin/settings/page.tsx`
- `apps/web/src/views/admin-settings-view/AdminSettingsPage.tsx`

---

## Developer Notes

1. **Adding New Settings:**
   - Insert into `admin_settings` table via SQL or use initialize endpoint
   - Follow existing naming convention: `category.setting_name`
   - Set appropriate `setting_type` for validation
   - Mark `is_sensitive` for passwords/credentials

2. **Testing:**
   - Use Playwright for E2E testing
   - Test both API endpoints and UI flows
   - Verify audit trail is captured

3. **Deployment:**
   - Run migration before deploying
   - Set `SETTINGS_ENCRYPTION_KEY` in production
   - Initialize settings on first deployment
   - Test clearinghouse connection after deployment

---

## Support

For issues or questions:
- Review this documentation
- Check implementation files for inline comments
- Verify database schema and data
- Test API endpoints directly
- Check application logs

---

**Implementation Status:** ✅ COMPLETE
**Last Updated:** January 2, 2026
**Implemented By:** Claude Code
