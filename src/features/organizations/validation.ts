export function isOrganizationNameValid(value: string): boolean {
  return value.trim().length > 0;
}

export function isEmailAddressValid(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
