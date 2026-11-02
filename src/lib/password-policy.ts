/** Politica de claves del backoffice. Devuelve los requisitos que NO se cumplen. */
export const PASSWORD_MIN_LENGTH = 10;

export type PasswordRule = { id: string; label: string; ok: boolean };

export function passwordRules(password: string, email?: string | null): PasswordRule[] {
  const localPart = (email ?? "").split("@")[0]?.toLowerCase() ?? "";
  return [
    {
      id: "length",
      label: `Al menos ${PASSWORD_MIN_LENGTH} caracteres`,
      ok: password.length >= PASSWORD_MIN_LENGTH,
    },
    { id: "letter", label: "Al menos una letra", ok: /[a-zA-Z]/.test(password) },
    { id: "number", label: "Al menos un número", ok: /\d/.test(password) },
    {
      id: "email",
      label: "Que no contenga tu email",
      ok: localPart.length < 3 || !password.toLowerCase().includes(localPart),
    },
  ];
}

export const isPasswordValid = (password: string, email?: string | null) =>
  passwordRules(password, email).every((rule) => rule.ok);
