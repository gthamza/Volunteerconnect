import { describe, expect, it } from "vitest";
import { isEmailAddressValid, isOrganizationNameValid } from "./validation";

describe("organization form validation", () => {
  it("requires a non-empty organization name", () => {
    expect(isOrganizationNameValid("  ")).toBe(false);
    expect(isOrganizationNameValid("Relief Network")).toBe(true);
  });

  it("accepts a basic email address and trims surrounding whitespace", () => {
    expect(isEmailAddressValid("person@example.org")).toBe(true);
    expect(isEmailAddressValid(" person@example.org ")).toBe(true);
  });

  it("rejects incomplete email addresses", () => {
    expect(isEmailAddressValid("person@localhost")).toBe(false);
    expect(isEmailAddressValid("person example.org")).toBe(false);
    expect(isEmailAddressValid("")).toBe(false);
  });
});
