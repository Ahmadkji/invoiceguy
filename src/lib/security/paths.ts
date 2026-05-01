export function getSafeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("..")) {
    return "/dashboard";
  }

  return value;
}
