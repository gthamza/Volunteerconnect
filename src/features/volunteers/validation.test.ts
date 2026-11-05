import { editProfileSchema, volunteerLocationSchema } from "./validation";

describe("volunteer profile edit form validation", () => {
  it("requires a yes or no answer for local-area knowledge", () => {
    expect(editProfileSchema.safeParse({ skillIds: [], disasterTypeIds: [] }).success).toBe(false);
    expect(editProfileSchema.safeParse({ localAreaKnowledge: true, skillIds: [], disasterTypeIds: [] }).success).toBe(true);
    expect(editProfileSchema.safeParse({ localAreaKnowledge: false, skillIds: [], disasterTypeIds: [] }).success).toBe(true);
  });

  it("accepts only UUID catalogue IDs", () => {
    expect(editProfileSchema.safeParse({ localAreaKnowledge: true, skillIds: ["not-a-uuid"], disasterTypeIds: [] }).success).toBe(false);
    expect(editProfileSchema.safeParse({ localAreaKnowledge: true, skillIds: [], disasterTypeIds: ["not-a-uuid"] }).success).toBe(false);
  });
});

describe("volunteer location form validation", () => {
  it("allows saving local-area knowledge without providing coordinates", () => {
    expect(volunteerLocationSchema.safeParse({ latitude: "", longitude: "", localAreaKnowledge: true }).success).toBe(true);
    expect(volunteerLocationSchema.safeParse({ latitude: "", longitude: "", localAreaKnowledge: false }).success).toBe(true);
  });

  it("requires a complete coordinate pair within valid geographic bounds", () => {
    expect(volunteerLocationSchema.safeParse({ latitude: "33.6844", longitude: "73.0479", localAreaKnowledge: true }).success).toBe(true);
    expect(volunteerLocationSchema.safeParse({ latitude: "91", longitude: "0", localAreaKnowledge: true }).success).toBe(false);
    expect(volunteerLocationSchema.safeParse({ latitude: "33", longitude: "", localAreaKnowledge: true }).success).toBe(false);
  });
});
