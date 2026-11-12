import { z } from "zod";

export const createTaskSchema = z.object({
  disasterTypeId: z.string().uuid("Select Flood or Earthquake."),
  description: z.string().trim().min(1, "Enter a task description."),
  latitude: z.string().trim(),
  longitude: z.string().trim(),
  requiredSkillIds: z.array(z.string().uuid()),
  requiredVolunteerCount: z.string().trim().regex(/^\d+$/, "Enter a positive whole number."),
}).superRefine((values, context) => {
  if (!values.latitude) context.addIssue({ code: z.ZodIssueCode.custom, path: ["latitude"], message: "Enter a latitude." });
  else if (!Number.isFinite(Number(values.latitude)) || Number(values.latitude) < -90 || Number(values.latitude) > 90) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["latitude"], message: "Latitude must be between -90 and 90." });
  }
  if (!values.longitude) context.addIssue({ code: z.ZodIssueCode.custom, path: ["longitude"], message: "Enter a longitude." });
  else if (!Number.isFinite(Number(values.longitude)) || Number(values.longitude) < -180 || Number(values.longitude) > 180) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["longitude"], message: "Longitude must be between -180 and 180." });
  }
  const volunteerCount = Number(values.requiredVolunteerCount);
  if (!Number.isSafeInteger(volunteerCount) || volunteerCount < 1) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["requiredVolunteerCount"], message: "Enter a positive whole number." });
  }
  if (new Set(values.requiredSkillIds).size !== values.requiredSkillIds.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["requiredSkillIds"], message: "A skill can only be selected once." });
  }
});

export type CreateTaskForm = z.infer<typeof createTaskSchema>;
