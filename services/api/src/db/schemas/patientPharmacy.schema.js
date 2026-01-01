import { pgTable, bigint, varchar, timestamp, boolean, text } from 'drizzle-orm/pg-core';

export const patient_pharmacies = pgTable('patient_pharmacies', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Core pharmacy information
  name: varchar('name', { length: 255 }),

  // Address fields
  address: varchar('address', { length: 255 }),
  addressLine2: varchar('address_line_2', { length: 255 }),
  city: varchar('city', { length: 255 }),
  state: varchar('state', { length: 2 }), // Two-letter state code
  zip_code: varchar('zip_code', { length: 10 }),
  country: varchar('country', { length: 100 }).default('USA'),

  // Contact information
  phone: varchar('phone', { length: 20 }),
  fax: varchar('fax', { length: 20 }),
  email: varchar('email', { length: 255 }),

  // NPI - National Provider Identifier (10-digit number)
  npi: varchar('npi', { length: 10 }),

  // DEA number for controlled substance dispensing
  deaNumber: varchar('dea_number', { length: 9 }),

  // Pharmacy type classification
  pharmacyType: varchar('pharmacy_type', { length: 50 }), // RETAIL, MAIL_ORDER, SPECIALTY, COMPOUNDING, etc.

  // Operating hours
  operatingHours: text('operating_hours'), // JSON string for hours

  // Status flags
  isActive: boolean('is_active').default(true),
  is24Hour: boolean('is_24_hour').default(false),
  acceptsMedicare: boolean('accepts_medicare').default(true),
  acceptsMedicaid: boolean('accepts_medicaid').default(true),
  deliversMedications: boolean('delivers_medications').default(false),

  // Notes
  notes: text('notes'),

  // Audit timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});