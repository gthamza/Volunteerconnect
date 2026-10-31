import { isThemePreference } from "./theme-provider";

describe("theme preference validation", () => {
  it.each(["system", "light", "dark"])('accepts "%s"', (value) => {
    expect(isThemePreference(value)).toBe(true);
  });

  it.each([null, "auto", "LIGHT", ""])('rejects %p', (value) => {
    expect(isThemePreference(value)).toBe(false);
  });
});
