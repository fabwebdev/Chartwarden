# Hospice Section - Total Routes Count

## Summary
**Total Routes in Hospice Section: 35+ routes**

## Route Breakdown

### Main Patient Routes (5 routes)
1. `/patients` - Patients list page
2. `/patients/add-new-patient` - Add new patient
3. `/patients/edit-patient/[id]` - Edit patient (dynamic)
4. `/patients/nursing-clinical-note/[id]` - Nursing clinical note (dynamic)
5. `/patients/nursing-clinical-note/[noteId]` - Nursing clinical note by note ID (dynamic)

### Patient Tab Routes (13 main tabs)
These are accessed via `/patients/[tab]/[id]` where `[tab]` is one of:
1. `/patients/teamComm/[id]` - Team Communication
2. `/patients/trends/[id]` - Trends
3. `/patients/hope/[id]` - Hope (HIS - Hospice Information System) 
4. `/patients/encounters/[id]` - Encounters
5. `/patients/care-plan/[id]` - Care Plan
6. `/patients/patient-info/[id]` - Patient Info
7. `/patients/idg-team/[id]` - IDG Team
8. `/patients/documents/[id]` - Documents
9. `/patients/library/[id]` - Library
10. `/patients/certifications/[id]` - Certifications
11. `/patients/med-list/[id]` - Medication List
12. `/patients/dose-spot/[id]` - Dose Spot
13. `/patients/patient_chart/[id]` - Patient Charts

### Patient Info Sub-Tabs (12 sub-routes)
Within `/patients/patient-info/[id]`, there are 12 sub-tabs:
1. General
2. Coverage
3. Location
4. IDG Team
5. Care Periods
6. DoseSpot Account
7. Patient History
8. Support Information
9. Demographics
10. Alert Tags
11. Patient Forms
12. Patient Portal

### Hope (HIS) Sub-Tabs (19 sub-routes)
Within `/patients/hope/[id]`, there are 19 sub-tabs:
1. Administrative Information
2. Discharge
3. Patient History & Diagnoses
4. Advance Care Planning
5. Spiritual / Existential
6. Supportive Assistance
7. Neuro / Behavioral
8. Sensory
9. Pain
10. Respiratory
11. Cardiac
12. Elimination
13. Functional
14. Endocrine
15. Hematological
16. Integumentary
17. Nutrition
18. Medications
19. Summary

## Detailed Count

- **Main Routes**: 5
- **Primary Patient Tabs**: 13
- **Patient Info Sub-Tabs**: 12
- **Hope (HIS) Sub-Tabs**: 19

**Total Unique Route Patterns**: 49 routes

Note: Some routes use dynamic parameters `[id]` and `[noteId]`, so the actual number of accessible routes depends on the number of patients/notes in the system.

## Route Structure

```
/patients                                    (Main list)
├── /add-new-patient                         (Add patient)
├── /edit-patient/[id]                       (Edit patient)
├── /nursing-clinical-note/[id]              (Clinical note)
├── /nursing-clinical-note/[noteId]          (Note by ID)
└── /[tab]/[id]                              (Patient tabs)
    ├── /teamComm/[id]
    ├── /trends/[id]
    ├── /hope/[id]                            (19 sub-tabs)
    ├── /encounters/[id]
    ├── /care-plan/[id]
    ├── /patient-info/[id]                    (12 sub-tabs)
    ├── /idg-team/[id]
    ├── /documents/[id]
    ├── /library/[id]
    ├── /certifications/[id]
    ├── /med-list/[id]
    ├── /dose-spot/[id]
    └── /patient_chart/[id]
```

## Permission-Based Routes

All routes are protected by permissions:
- Main menu: `patients_principal_menu`
- Secondary tabs: Various `*_secondary_menu` permissions
- Tertiary tabs: Various `*_tertiary_menu` permissions

Routes are dynamically shown/hidden based on user permissions.

