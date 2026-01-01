/**
 * Prognosis Model
 * Compatibility layer for legacy controller using Drizzle ORM
 */
import { db } from '../db/index.js';
import { prognosis } from '../db/schemas/prognosis.schema.js';
import { eq } from 'drizzle-orm';

const Prognosis = {
  async findAll() {
    return await db.select().from(prognosis);
  },

  async findOne(options) {
    if (options?.where?.patient_id) {
      const results = await db.select().from(prognosis).where(eq(prognosis.patient_id, options.where.patient_id));
      return results[0] || null;
    }
    return null;
  },

  async findByPk(id) {
    const results = await db.select().from(prognosis).where(eq(prognosis.id, id));
    return results[0] || null;
  },

  async create(data) {
    const result = await db.insert(prognosis).values(data).returning();
    return result[0];
  },

  async update(data, options) {
    if (options?.where?.id) {
      const result = await db.update(prognosis)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(prognosis.id, options.where.id))
        .returning();
      return [result.length, result];
    }
    return [0, []];
  },

  async destroy(options) {
    if (options?.where?.id) {
      await db.delete(prognosis).where(eq(prognosis.id, options.where.id));
      return 1;
    }
    return 0;
  }
};

export default Prognosis;
