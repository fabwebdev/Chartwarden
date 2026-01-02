# Patient Detail UI Components

## Overview

A comprehensive set of UI components for displaying and managing detailed patient information including demographics, identifiers, addresses, contacts, pharmacy details, and insurance/payer information.

## Components

### PatientDetailPage (Main Component)
Full-featured patient detail view with all sections in a single page layout.

**Location:** `views/patients-views/patient-detail/PatientDetailPage.tsx`

**Usage:**
```tsx
import { PatientDetailPage } from 'views/patients-views/patient-detail';

// In your component
<PatientDetailPage patientId={patientId} showBreadcrumbs={true} />
```

**Props:**
- `patientId?: string | number` - Patient ID (optional if using URL params)
- `showBreadcrumbs?: boolean` - Show/hide breadcrumb navigation (default: true)

---

### Individual Section Components

Each section can be used independently:

#### 1. PatientDemographicsCard
Displays patient demographics including name, DOB, age, gender, SSN, consent flags, etc.

**Usage:**
```tsx
import { PatientDemographicsCard } from 'views/patients-views/patient-detail';

<PatientDemographicsCard patient={patientData} loading={false} />
```

**Props:**
- `patient: Patient | null` - Patient data object
- `loading?: boolean` - Loading state

---

#### 2. PatientIdentifiersCard
Displays medical identifiers (MRN, Medicare MBI, Medicaid ID, SSN).

**Usage:**
```tsx
import { PatientIdentifiersCard } from 'views/patients-views/patient-detail';

<PatientIdentifiersCard patient={patientData} loading={false} />
```

**Props:**
- `patient: any` - Patient data with identifiers
- `loading?: boolean` - Loading state

---

#### 3. PatientAddressesSection
Interactive section for managing patient addresses with CRUD operations.

**Usage:**
```tsx
import { PatientAddressesSection } from 'views/patients-views/patient-detail';

<PatientAddressesSection patientId={patientId} />
```

**Props:**
- `patientId: string | number` - Patient ID (required)

**Features:**
- Lists all patient addresses grouped by type
- Supports PRIMARY, BILLING, MAILING, FACILITY, TEMPORARY address types
- Add/Edit/Delete functionality (permission-based)
- Set primary address
- Displays verification status

**Permissions Required:**
- Read: All authenticated users
- Edit: `patients_principal_menu_edit` or `update:patient` or admin role

---

#### 4. PatientContactsSection
Interactive section for managing patient contacts including emergency contacts.

**Usage:**
```tsx
import { PatientContactsSection } from 'views/patients-views/patient-detail';

<PatientContactsSection patientId={patientId} />
```

**Props:**
- `patientId: string | number` - Patient ID (required)

**Features:**
- Lists emergency and other contacts separately
- Contact types: EMERGENCY, FAMILY, CAREGIVER, HEALTHCARE_PROXY, LEGAL, FUNERAL_HOME, CLERGY, OTHER
- Authorization flags: PHI access, decision-making authority, key to home, etc.
- Add/Edit/Delete functionality (permission-based)
- Set primary contact
- Advanced options: secondary phone, address, legal documents

**Permissions Required:**
- Read: All authenticated users
- Edit: `patients_principal_menu_edit` or `update:patient` or admin role

---

#### 5. PatientPharmacySection
Displays assigned pharmacy information.

**Usage:**
```tsx
import { PatientPharmacySection } from 'views/patients-views/patient-detail';

<PatientPharmacySection
  patientId={patientId}
  pharmacyId={patient.patient_pharmacy_id}
/>
```

**Props:**
- `patientId: string | number` - Patient ID (required)
- `pharmacyId?: string | number | null` - Pharmacy ID

**Features:**
- Displays pharmacy name, type, address, contact info
- Shows NPI and DEA numbers
- Indicates 24-hour service and delivery capability
- Medicare/Medicaid acceptance flags

---

#### 6. PatientPayersSection
Interactive section for managing insurance and payer information.

**Usage:**
```tsx
import { PatientPayersSection } from 'views/patients-views/patient-detail';

<PatientPayersSection patientId={patientId} />
```

**Props:**
- `patientId: string | number` - Patient ID (required)

**Features:**
- Lists all payers ordered by coordination of benefits (COB)
- Payer types: MEDICARE, MEDICAID, COMMERCIAL, MANAGED_CARE, TRICARE, CHAMPVA, WORKERS_COMP, AUTO, SELF_PAY, OTHER
- Medicare-specific fields: MBI, hospice election date, Part A/B effective dates
- Medicaid-specific fields: Medicaid ID, state
- Dual eligible flag
- Subscriber information and relationship
- Authorization details
- Coverage dates (effective/termination)
- Verify eligibility functionality
- Reorder payers for COB
- Add/Edit/Delete functionality (permission-based)

**Permissions Required:**
- Read: All authenticated users
- Edit: `patients_principal_menu_edit` or `update:patient` or admin role

---

## API Functions

All API functions are available in `apps/web/src/api/patient.ts`:

### Address API
```typescript
getPatientAddresses(patientId, type?) // List addresses
getPatientAddress(patientId, addressId) // Get single address
createPatientAddress(patientId, addressData) // Create
updatePatientAddress(patientId, addressId, addressData) // Update
deletePatientAddress(patientId, addressId) // Soft delete
setPatientAddressPrimary(patientId, addressId) // Set as primary
```

### Contact API
```typescript
getPatientContacts(patientId, type?) // List contacts
getPatientEmergencyContacts(patientId) // Emergency contacts only
getPatientContact(patientId, contactId) // Get single contact
createPatientContact(patientId, contactData) // Create
updatePatientContact(patientId, contactId, contactData) // Update
deletePatientContact(patientId, contactId) // Soft delete
setPatientContactPrimary(patientId, contactId) // Set as primary
```

### Payer API
```typescript
getPatientPayers(patientId, options?) // List payers
getPatientPrimaryPayer(patientId) // Primary payer only
getPatientPayer(patientId, payerId) // Get single payer
createPatientPayer(patientId, payerData) // Create
updatePatientPayer(patientId, payerId, payerData) // Update
deletePatientPayer(patientId, payerId) // Soft delete
setPatientPayerPrimary(patientId, payerId) // Set as primary
verifyPatientPayer(patientId, payerId, verificationData) // Verify eligibility
reorderPatientPayers(patientId, payerOrders) // Reorder for COB
```

---

## TypeScript Types

All types are defined in `apps/web/src/types/patient.ts`:

```typescript
interface PatientAddress {
  id?: number | string;
  patient_id?: number | string;
  address_type?: 'PRIMARY' | 'BILLING' | 'MAILING' | 'FACILITY' | 'TEMPORARY';
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  zip_code: string;
  county?: string;
  phone_number?: string;
  is_primary?: boolean;
  is_verified?: boolean;
  is_active?: boolean;
  notes?: string;
  // ... more fields
}

interface PatientContact {
  id?: number | string;
  patient_id?: number | string;
  contact_type?: 'EMERGENCY' | 'FAMILY' | 'CAREGIVER' | 'HEALTHCARE_PROXY' | 'LEGAL' | 'FUNERAL_HOME' | 'CLERGY' | 'OTHER';
  first_name: string;
  last_name: string;
  relationship: string;
  primary_phone: string;
  authorized_for_phi?: boolean;
  authorized_for_decisions?: boolean;
  // ... more fields
}

interface PatientPayer {
  id?: number | string;
  patient_id?: number | string;
  payer_type: 'MEDICARE' | 'MEDICAID' | 'COMMERCIAL' | 'MANAGED_CARE' | 'TRICARE' | 'CHAMPVA' | 'WORKERS_COMP' | 'AUTO' | 'SELF_PAY' | 'OTHER';
  payer_name: string;
  payer_order?: number;
  policy_number?: string;
  group_number?: string;
  medicare_beneficiary_id?: string;
  medicaid_id?: string;
  is_dual_eligible?: boolean;
  // ... more fields
}
```

---

## Integration Examples

### Option 1: Standalone Detail Page
Use PatientDetailPage as a full-page view:

```tsx
// In app/(dashboard)/patients/detail/[id]/page.tsx
import { PatientDetailPage } from 'views/patients-views/patient-detail';

export default function PatientDetail() {
  return <PatientDetailPage />;
}
```

### Option 2: Replace Existing Tabs
Replace static tabs in PatientInfoPage:

```tsx
// In PatientInfoPage.tsx
import { PatientAddressesSection, PatientContactsSection, PatientPayersSection } from 'views/patients-views/patient-detail';

// Replace LocationPage tab content:
<TabPanel value={value} index={2}>
  <PatientAddressesSection patientId={patientId} />
  <PatientContactsSection patientId={patientId} />
</TabPanel>

// Replace CoveragePage tab content:
<TabPanel value={value} index={1}>
  <PatientPayersSection patientId={patientId} />
</TabPanel>
```

### Option 3: Add as New Tab
Add a new "Complete Details" tab:

```tsx
// In PatientInfoPage.tsx
<Tab
  value={11}
  label={
    <Grid container spacing={1}>
      <Grid item><InfoCircle size={18} /></Grid>
      <Grid item>Complete Details</Grid>
    </Grid>
  }
/>

{/* Tab content */}
<TabPanel value={value} index={11}>
  <PatientDetailPage patientId={patientId} showBreadcrumbs={false} />
</TabPanel>
```

---

## Security & Compliance

### HIPAA Compliance
- SSN displayed with masking (XXX-XX-1234)
- PHI authorization flags tracked for contacts
- Audit logging on all create/update/delete operations (backend)

### Permission-Based Access Control
Components check user permissions before allowing modifications:
- Admin users: Full access
- Users with `update:patient` permission: Full access
- Users with `patients_principal_menu_edit` permission: Full access
- All other users: Read-only access

### Data Validation
- Required fields enforced
- Phone number formatting
- ZIP code validation
- State selection from US states only
- Medicare MBI format validation
- Medicaid ID validation

---

## Backend API Endpoints

All endpoints are available at `http://localhost:3001/api`:

```
# Patient Addresses
GET    /patients/:patientId/addresses
GET    /patients/:patientId/addresses/:id
POST   /patients/:patientId/addresses
PUT    /patients/:patientId/addresses/:id
DELETE /patients/:patientId/addresses/:id
POST   /patients/:patientId/addresses/:id/set-primary

# Patient Contacts
GET    /patients/:patientId/contacts
GET    /patients/:patientId/emergency-contacts
GET    /patients/:patientId/contacts/:id
POST   /patients/:patientId/contacts
PUT    /patients/:patientId/contacts/:id
DELETE /patients/:patientId/contacts/:id
POST   /patients/:patientId/contacts/:id/set-primary

# Patient Payers
GET    /patients/:patientId/payers
GET    /patients/:patientId/payers/primary
GET    /patients/:patientId/payers/:id
POST   /patients/:patientId/payers
PUT    /patients/:patientId/payers/:id
DELETE /patients/:patientId/payers/:id
POST   /patients/:patientId/payers/:id/set-primary
POST   /patients/:patientId/payers/:id/verify
POST   /patients/:patientId/payers/reorder

# Patient Pharmacy
GET    /patient/patientPharmacy/:id
```

---

## Troubleshooting

### Components not rendering
- Ensure patient ID is available in URL params or passed as prop
- Check console for API errors
- Verify backend API is running on port 3001

### Permission errors
- Check user role and permissions in AuthService
- Verify user has `update:patient` or `patients_principal_menu_edit` permission
- Admin users bypass all permission checks

### API errors
- Ensure backend routes are registered in services/api/src/routes/
- Verify database tables exist: patient_contacts, addresses, patient_payers
- Check network tab for API response errors

---

## Testing

To test the components:

1. Start the development servers:
```bash
npm run dev
```

2. Navigate to a patient detail page:
```
http://localhost:3000/patients/patient-info/1
```

3. Verify all sections load correctly
4. Test CRUD operations (if you have edit permissions)
5. Check responsive layout on mobile/tablet viewports

---

## Future Enhancements

- [ ] Print-friendly view option
- [ ] Export patient details to PDF
- [ ] Inline editing for quick updates
- [ ] Bulk contact import
- [ ] Payer eligibility verification integration
- [ ] Address geocoding and validation
- [ ] Contact relationship suggestions
- [ ] Insurance card upload and OCR
