import { z } from "zod";

export const editProfileSchema = z.object({
  localAreaKnowledge: z.boolean({ required_error: "Please choose Yes or No." }),
  skillIds: z.array(z.string().uuid()),
  disasterTypeIds: z.array(z.string().uuid()),
});

export type EditProfileForm = z.infer<typeof editProfileSchema>;

export const volunteerPreferencesSchema = z.object({
  skillIds: z.array(z.string().uuid()),
  disasterTypeIds: z.array(z.string().uuid()),
}).superRefine((values, context) => {
  if (new Set(values.skillIds).size !== values.skillIds.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["skillIds"], message: "A skill can only be selected once." });
  }
  if (new Set(values.disasterTypeIds).size !== values.disasterTypeIds.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["disasterTypeIds"], message: "A disaster type can only be selected once." });
  }
});

export type VolunteerPreferencesForm = z.infer<typeof volunteerPreferencesSchema>;

export const volunteerLocationSchema = z.object({
  latitude: z.string(),
  longitude: z.string(),
  localAreaKnowledge: z.boolean({ required_error: "Please choose Yes or No." }),
}).superRefine(({ latitude, longitude }, context) => {
  const latitudeText = latitude.trim();
  const longitudeText = longitude.trim();
  if (!latitudeText && !longitudeText) return;
  if (!latitudeText || !longitudeText) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: [!latitudeText ? "latitude" : "longitude"], message: "Enter both latitude and longitude." });
    return;
  }
  const latitudeValue = Number(latitudeText);
  const longitudeValue = Number(longitudeText);
  if (!Number.isFinite(latitudeValue) || latitudeValue < -90 || latitudeValue > 90) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["latitude"], message: "Latitude must be between -90 and 90." });
  }
  if (!Number.isFinite(longitudeValue) || longitudeValue < -180 || longitudeValue > 180) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["longitude"], message: "Longitude must be between -180 and 180." });
  }
});

export type VolunteerLocationForm = z.infer<typeof volunteerLocationSchema>;
