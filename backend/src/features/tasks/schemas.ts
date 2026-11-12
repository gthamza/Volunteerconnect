import { z } from "zod";

const uuid = z.string().uuid();

const affectedLocationSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
}).strict();

const taskDescriptionSchema = z.string().trim().min(1);

const requiredSkillIdsSchema = z.array(uuid).refine(
  (skillIds) => new Set(skillIds.map((skillId) => skillId.toLowerCase())).size === skillIds.length,
  { message: "Skill IDs must not contain duplicates." },
);

const requiredVolunteerCountSchema = z.number().int().positive();

export const createTaskSchema = z.object({
  disasterTypeId: uuid,
  description: taskDescriptionSchema,
  affectedLocation: affectedLocationSchema,
  requiredSkillIds: requiredSkillIdsSchema,
  requiredVolunteerCount: requiredVolunteerCountSchema,
}).strict();

export const updateTaskSchema = z.object({
  disasterTypeId: uuid.optional(),
  description: taskDescriptionSchema.optional(),
  affectedLocation: affectedLocationSchema.optional(),
  requiredSkillIds: requiredSkillIdsSchema.optional(),
  requiredVolunteerCount: requiredVolunteerCountSchema.optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: "At least one permitted task field is required.",
});

export const taskIdSchema = z.object({ id: uuid }).strict();

export const taskStatusSchema = z.object({
  status: z.enum(["Assigned", "Ongoing", "Completed"]),
}).strict();

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type TaskStatusInput = z.infer<typeof taskStatusSchema>;
