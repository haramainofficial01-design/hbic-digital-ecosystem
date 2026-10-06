export async function requestAcademyPasswordReset(
  email: string,
  send: (normalizedEmail: string) => Promise<unknown>
): Promise<string> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return "Enter your parent email address first.";
  try {
    await send(normalizedEmail);
    return "If an account exists for that email, a password reset link has been sent.";
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    return code === "auth/invalid-email"
      ? "Enter a valid parent email address."
      : "We couldn’t send the password reset email. Check the address and try again.";
  }
}
