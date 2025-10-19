export const isStrongPassword = (value: string): boolean => /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$/.test(value);

export const isValidWorkspaceSlug = (candidate: string): boolean => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(candidate);
