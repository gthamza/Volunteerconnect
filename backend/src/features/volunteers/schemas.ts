import { z } from "zod";

const uuid = z.string().uuid();

export const createProfileSchema = z.object({}).strict();

export const updateProfileSchema = z.object({
  localAreaKnowledge: z.boolean().optional(),
  location: z.object({
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
  }).strict().nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: "At least one permitted profile field is required.",
});

export const addSkillsSchema = z.object({
  skillIds: z.array(uuid).min(1).max(100),
}).strict().refine(({ skillIds }) => new Set(skillIds).size === skillIds.length, {
  message: "Skill IDs must not contain duplicates.",
  path: ["skillIds"],
});

export const addDisasterTypesSchema = z.object({
  disasterTypeIds: z.array(uuid).min(1).max(2),
}).strict().refine(({ disasterTypeIds }) => new Set(disasterTypeIds).size === disasterTypeIds.length, {
  message: "Disaster type IDs must not contain duplicates.",
  path: ["disasterTypeIds"],
});

export const associationIdSchema = z.object({ id: uuid }).strict();

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type AddSkillsInput = z.infer<typeof addSkillsSchema>;
export type AddDisasterTypesInput = z.infer<typeof addDisasterTypesSchema>;
