import { db } from "../../config/db.drizzle.js";
import { logger } from '../../utils/logger.js';
import { 
  admitted_form, 
  site_of_service, 
  prognosis_patient, 
  prognosis_imminence_of_death, 
  prognosis_caregiver, 
  nutrition_template, 
  nutrition_problems_type 
} from "../../db/schemas/index.js";

class SelectController {
    // Get all site of service options
    async siteOfServiceList(request, reply) {
        try {
            const siteOfService = await db.select({
                id: site_of_service.id,
                name: site_of_service.name,
                createdAt: site_of_service.createdAt,
                updatedAt: site_of_service.updatedAt
            }).from(site_of_service);
            reply.code(200);
            return siteOfService;
        } catch (error) {
            logger.error("Error fetching site of service list:", error)
            reply.code(500);
            return {
                message: "Internal server error",
                error: error.message,
            };
        }
    }

    // Get all admitted form options
    async admittedFormList(request, reply) {
        try {
            const admittedForm = await db.select({
                id: admitted_form.id,
                name: admitted_form.name,
                createdAt: admitted_form.createdAt,
                updatedAt: admitted_form.updatedAt
            }).from(admitted_form);
            reply.code(200);
            return admittedForm;
        } catch (error) {
            logger.error("Error fetching admitted form list:", error)
            reply.code(500);
            return {
                message: "Internal server error",
                error: error.message,
            };
        }
    }

    // Get all prognosis patient options
    async prognosisPatientList(request, reply) {
        try {
            const prognosisPatient = await db.select({
                id: prognosis_patient.id,
                name: prognosis_patient.name,
                createdAt: prognosis_patient.createdAt,
                updatedAt: prognosis_patient.updatedAt
            }).from(prognosis_patient);
            reply.code(200);
            return prognosisPatient;
        } catch (error) {
            logger.error("Error fetching prognosis patient list:", error)
            reply.code(500);
            return {
                message: "Internal server error",
                error: error.message,
            };
        }
    }

    // Get all prognosis imminence options
    async prognosisImminence(request, reply) {
        try {
            const prognosisImminence = await db.select({
                id: prognosis_imminence_of_death.id,
                name: prognosis_imminence_of_death.name,
                createdAt: prognosis_imminence_of_death.createdAt,
                updatedAt: prognosis_imminence_of_death.updatedAt
            }).from(prognosis_imminence_of_death);
            reply.code(200);
            return prognosisImminence;
        } catch (error) {
            logger.error("Error fetching prognosis imminence list:", error)
            reply.code(500);
            return {
                message: "Internal server error",
                error: error.message,
            };
        }
    }

    // Get all prognosis caregiver options
    async prognosisCaregiver(request, reply) {
        try {
            const prognosisCaregiver = await db.select({
                id: prognosis_caregiver.id,
                name: prognosis_caregiver.name,
                createdAt: prognosis_caregiver.createdAt,
                updatedAt: prognosis_caregiver.updatedAt
            }).from(prognosis_caregiver);
            reply.code(200);
            return prognosisCaregiver;
        } catch (error) {
            logger.error("Error fetching prognosis caregiver list:", error)
            reply.code(500);
            return {
                message: "Internal server error",
                error: error.message,
            };
        }
    }

    // Get all nutrition template options
    async nutitionTemplate(request, reply) {
        try {
            const nutritionTemplate = await db.select({
                id: nutrition_template.id,
                name: nutrition_template.name,
                createdAt: nutrition_template.createdAt,
                updatedAt: nutrition_template.updatedAt
            }).from(nutrition_template);
            reply.code(200);
            return nutritionTemplate;
        } catch (error) {
            logger.error("Error fetching nutrition template list:", error)
            reply.code(500);
            return {
                message: "Internal server error",
                error: error.message,
            };
        }
    }

    // Get all nutrition problem options
    async nutitionProblem(request, reply) {
        try {
            const nutritionProblemsType = await db.select({
                id: nutrition_problems_type.id,
                name: nutrition_problems_type.name,
                createdAt: nutrition_problems_type.createdAt,
                updatedAt: nutrition_problems_type.updatedAt
            }).from(nutrition_problems_type);
            reply.code(200);
            return nutritionProblemsType;
        } catch (error) {
            logger.error("Error fetching nutrition problem list:", error)
            reply.code(500);
            return {
                message: "Internal server error",
                error: error.message,
            };
        }
    }
}

export default new SelectController();