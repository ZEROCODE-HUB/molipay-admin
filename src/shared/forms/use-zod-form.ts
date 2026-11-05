import { zodResolver } from "@hookform/resolvers/zod";
import { useForm,type UseFormProps } from "react-hook-form";
import type { z } from "zod";

/**
 * React Hook Form + zod con los tipos correctos en cada limite:
 * - los campos manejan `z.input<schema>` (lo que escribe el usuario);
 * - `handleSubmit` entrega `z.output<schema>` (ya validado y transformado).
 */
export function useZodForm<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  options: Omit<UseFormProps<z.input<TSchema>, unknown, z.output<TSchema>>, "resolver"> = {},
) {
  return useForm<z.input<TSchema>, unknown, z.output<TSchema>>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    ...options,
  });
}
