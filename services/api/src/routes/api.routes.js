import { db } from "../config/db.drizzle.js";
import redisService from "../services/RedisService.js";
import authRoutes from "./auth.routes.js";
import benefitPeriodRoutes from "./patient/BenefitPeriod.routes.js";
import cardiacAssessmentRoutes from "./patient/CardiacAssessment.routes.js";
import dischargeRoutes from "./patient/Discharge.routes.js";
import endocrineAssessmentRoutes from "./patient/EndocrineAssessment.routes.js";
import hematologicalAssessmentRoutes from "./patient/HematologicalAssessment.routes.js";
import integumentaryAssessmentRoutes from "./patient/IntegumentaryAssessment.routes.js";
import nursingClinicalNoteRoutes from "./patient/NursingClinicalNote.routes.js";
import nutritionRoutes from "./patient/Nutrition.routes.js";
import painRoutes from "./patient/Pain.routes.js";
import painTypeRoutes from "./pain-type.routes.js";
import patientRoutes from "./patient/Patient.routes.js";
import prognosisRoutes from "./patient/Prognosis.routes.js";
import selectRoutes from "./patient/Select.routes.js";
import vitalSignsRoutes from "./patient/VitalSigns.routes.js";
import visitInformationRoutes from "./patient/VisitInformation.routes.js";
import hisPdfRoutes from "./patient/HisPdf.routes.js";
import hopeAssessmentRoutes from "./hopeAssessment.routes.js";
import encounterRoutes from "./encounter.routes.js";
import carePlanRoutes from "./carePlan.routes.js";
import idgMeetingRoutes from "./idgMeeting.routes.js";
import certificationRoutes from "./certification.routes.js";
import medicationRoutes from "./medication.routes.js";
import billingRoutes from "./billing.routes.js";
import capTrackingRoutes from "./capTracking.routes.js";
import cbsaRoutes from "./cbsa.routes.js";
import claimValidationRoutes from "./claimValidation.routes.js";
import clearinghouseRoutes from "./clearinghouse.routes.js";
import analyticsRoutes from "./analytics.routes.js";
import eligibilityRoutes from "./eligibility.routes.js";
import eraRoutes from "./era.routes.js";
import denialManagementRoutes from "./denialManagement.routes.js";
import revenueRecognitionRoutes from "./revenueRecognition.routes.js";
import staffRoutes from "./staff.routes.js";
import schedulingRoutes from "./scheduling.routes.js";
import bereavementRoutes from "./bereavement.routes.js";
import qapiRoutes from "./qapi.routes.js";
import reportsRoutes from "./reports.routes.js";
import addressRoutes from "./patient/Address.routes.js";
import admissionInformationRoutes from "./patient/AdmissionInformation.routes.js";
import dmeProviderRoutes from "./patient/DmeProvider.routes.js";
import dnrRoutes from "./patient/Dnr.routes.js";
import emergencyPreparednessLevelRoutes from "./patient/EmergencyPreparednessLevel.routes.js";
import liaisonPrimaryRoutes from "./patient/LiaisonPrimary.routes.js";
import liaisonSecondaryRoutes from "./patient/LiaisonSecondary.routes.js";
import livingArrangementsRoutes from "./patient/LivingArrangements.routes.js";
import patientIdentifiersRoutes from "./patient/PatientIdentifiers.routes.js";
import patientPharmacyRoutes from "./patient/PatientPharmacy.routes.js";
import payerInformationRoutes from "./patient/PayerInformation.routes.js";
import primaryDiagnosisRoutes from "./patient/PrimaryDiagnosis.routes.js";
import raceEthnicityRoutes from "./patient/RaceEthnicity.routes.js";
import signatureRoutes from "./patient/Signature.routes.js";
import SignatureController from "../controllers/patient/Signature.controller.js";
import spiritualPreferenceRoutes from "./patient/SpiritualPreference.routes.js";
import rbacRoutes from "./rbac.routes.js";
import auditRoutes from "./audit.routes.js";
import abacDemoRoutes from "./abac-demo.routes.js";
import caslDemoRoutes from "./casl-demo.routes.js";
import userRoutes from "./user.routes.js";
import permissionRoutes from "./permission.routes.js";
import { authenticate } from "../middleware/betterAuth.middleware.js";
import errorTestRoutes from "./errorTest.routes.js";

// Fastify plugin for API routes
async function apiRoutes(fastify, options) {
  // Health check endpoint (public - no authentication required)
  fastify.get("/health", async (request, reply) => {
    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        database: { status: "unknown" },
        redis: { status: "unknown" },
      },
    };

    // Test database connection
    try {
      await db.execute("SELECT 1");
      health.services.database = { status: "connected" };
    } catch (error) {
      health.services.database = {
        status: "disconnected",
        error: error.message,
      };
      health.status = "degraded";
    }

    // Test Redis connection
    try {
      const redisHealth = await redisService.healthCheck();
      health.services.redis = {
        status: redisHealth.status === "healthy" ? "connected" : "disconnected",
        latencyMs: redisHealth.latencyMs,
        version: redisHealth.version,
        usedMemory: redisHealth.usedMemory,
      };
      if (redisHealth.status !== "healthy") {
        health.status = "degraded";
      }
    } catch (error) {
      health.services.redis = {
        status: "disconnected",
        error: error.message,
      };
      // Redis is optional, so don't mark as degraded if DB is healthy
    }

    // Set response code based on health status
    if (health.status === "unhealthy") {
      reply.code(503);
    } else if (health.status === "degraded") {
      reply.code(200); // Still return 200 for degraded (optional services down)
    }

    return health;
  });

  // Detailed Redis health check endpoint
  fastify.get("/health/redis", async (request, reply) => {
    try {
      const healthCheck = await redisService.healthCheck();
      return healthCheck;
    } catch (error) {
      reply.code(503);
      return {
        status: "unhealthy",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  });

  // Public routes
  await fastify.register(authRoutes);

  // Apply authentication middleware to all routes below this point
  fastify.addHook("onRequest", authenticate);

  // Record Completion Signatures routes (at root level for frontend compatibility)
  // These are aliases for signature routes
  fastify.get("/recordCompletionSignatures", {
    preHandler: [authenticate],
  }, SignatureController.index);
  
  fastify.get("/recordCompletionSignatures/:id", {
    preHandler: [authenticate],
  }, SignatureController.show);

  // Protected routes
  await fastify.register(benefitPeriodRoutes, { prefix: "/benefit-periods" });
  await fastify.register(cardiacAssessmentRoutes, { prefix: "/cardiac-assessment" });
  await fastify.register(dischargeRoutes, { prefix: "/discharge" });
  await fastify.register(endocrineAssessmentRoutes, { prefix: "/endocrine-assessment" });
  await fastify.register(hematologicalAssessmentRoutes, { prefix: "/hematological-assessment" });
  await fastify.register(integumentaryAssessmentRoutes, { prefix: "/integumentary-assessment" });
  await fastify.register(nursingClinicalNoteRoutes, { prefix: "/nursing-clinical-notes" });
  await fastify.register(nutritionRoutes, { prefix: "/nutrition-assessment" });
  await fastify.register(painRoutes, { prefix: "/pain" });
  
  // Register pain-type routes at root level for backward compatibility
  // Frontend calls /api/pain-type/... but routes are at /api/pain/pain-type/...
  // This creates aliases so both paths work
  await fastify.register(painTypeRoutes);
  
  await fastify.register(patientRoutes, { prefix: "/patient" });
  await fastify.register(prognosisRoutes, { prefix: "/prognosis" });
  await fastify.register(selectRoutes, { prefix: "/select" });
  await fastify.register(vitalSignsRoutes, { prefix: "/vital-signs" });
  await fastify.register(visitInformationRoutes, { prefix: "/visit-information" });
  await fastify.register(hisPdfRoutes, { prefix: "/his-pdf" });
  await fastify.register(hopeAssessmentRoutes); // HOPE assessments (no prefix, routes define their own paths)
  await fastify.register(encounterRoutes); // Encounters (no prefix, routes define their own paths)
  await fastify.register(carePlanRoutes); // Care planning (no prefix, routes define their own paths)
  await fastify.register(idgMeetingRoutes); // IDG meetings (no prefix, routes define their own paths)
  await fastify.register(certificationRoutes); // Certifications (no prefix, routes define their own paths)
  await fastify.register(medicationRoutes); // Medications (no prefix, routes define their own paths)
  await fastify.register(billingRoutes); // Billing (no prefix, routes define their own paths)
  await fastify.register(capTrackingRoutes); // Cap Tracking (no prefix, routes define their own paths)
  await fastify.register(cbsaRoutes); // CBSA Tracking - Phase 2A (no prefix, routes define their own paths)
  await fastify.register(claimValidationRoutes); // Claim Validation - Phase 2B (no prefix, routes define their own paths)
  await fastify.register(clearinghouseRoutes); // Clearinghouse/EDI - Phase 2C (no prefix, routes define their own paths)
  await fastify.register(analyticsRoutes); // Analytics/Reporting - Phase 2D (no prefix, routes define their own paths)
  await fastify.register(eligibilityRoutes, { prefix: "/eligibility" }); // Eligibility Verification - Phase 3A
  await fastify.register(eraRoutes, { prefix: "/era" }); // ERA Processing & Auto-Posting - Phase 3B
  await fastify.register(denialManagementRoutes, { prefix: "/denials" }); // Denial Management & Appeals - Phase 3C
  await fastify.register(revenueRecognitionRoutes, { prefix: "/revenue" }); // Revenue Recognition & Forecasting - Phase 3D
  await fastify.register(staffRoutes); // Staff Management (no prefix, routes define their own paths)
  await fastify.register(schedulingRoutes); // Scheduling (no prefix, routes define their own paths)
  await fastify.register(bereavementRoutes); // Bereavement (no prefix, routes define their own paths)
  await fastify.register(qapiRoutes); // QAPI (no prefix, routes define their own paths)
  await fastify.register(reportsRoutes); // Reports (no prefix, routes define their own paths)
  await fastify.register(addressRoutes, { prefix: "/address" });
  await fastify.register(admissionInformationRoutes, { prefix: "/admission-information" });
  await fastify.register(dmeProviderRoutes, { prefix: "/dme-provider" });
  await fastify.register(dnrRoutes, { prefix: "/dnr" });
  await fastify.register(emergencyPreparednessLevelRoutes, { prefix: "/emergency-preparedness-level" });
  await fastify.register(liaisonPrimaryRoutes, { prefix: "/liaison-primary" });
  await fastify.register(liaisonSecondaryRoutes, { prefix: "/liaison-secondary" });
  await fastify.register(livingArrangementsRoutes, { prefix: "/living-arrangements" });
  await fastify.register(patientIdentifiersRoutes, { prefix: "/patient-identifiers" });
  await fastify.register(patientPharmacyRoutes, { prefix: "/patient-pharmacy" });
  await fastify.register(payerInformationRoutes, { prefix: "/payer-information" });
  await fastify.register(primaryDiagnosisRoutes, { prefix: "/primary-diagnosis" });
  await fastify.register(raceEthnicityRoutes, { prefix: "/race-ethnicity" });
  await fastify.register(signatureRoutes, { prefix: "/signature" });
  await fastify.register(spiritualPreferenceRoutes, { prefix: "/spiritual-preference" });
  await fastify.register(rbacRoutes, { prefix: "/rbac" });
  await fastify.register(auditRoutes, { prefix: "/audit" });
  await fastify.register(abacDemoRoutes, { prefix: "/abac-demo" });
  await fastify.register(caslDemoRoutes, { prefix: "/casl-demo" });
  await fastify.register(userRoutes);
  await fastify.register(permissionRoutes);

  // Error handling test routes (development/testing only)
  if (process.env.NODE_ENV !== 'production') {
    await fastify.register(errorTestRoutes);
  }
}

export default apiRoutes;
