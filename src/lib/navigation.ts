export function safeNextPath(value: FormDataEntryValue | string | null | undefined) {
  if (typeof value !== "string") return "/dashboard";

  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}
