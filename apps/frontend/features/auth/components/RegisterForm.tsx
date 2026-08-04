"use client";

import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { useAuth } from "../hooks/useAuth";
import { registerSchema } from "../schemas";

type RegisterFormValues = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const { register: registerAuth } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      handle: "",
      display_name: "",
    },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setError(null);
    try {
      await registerAuth(data);
    } catch (err: any) {
      setError(err.message || "Failed to create account");
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
        <CardDescription>
          Join Clarity today and start building your network.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="flex flex-col gap-4">
          {error && (
            <div className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}
          <FieldGroup>
            <Field data-invalid={!!errors.email ? "" : undefined}>
              <FieldLabel>Email</FieldLabel>
              <Input
                type="email"
                placeholder="you@example.com"
                {...register("email")}
                aria-invalid={!!errors.email}
              />
              {errors.email && (
                <FieldDescription className="text-destructive">
                  {errors.email.message}
                </FieldDescription>
              )}
            </Field>

            <Field data-invalid={!!errors.password ? "" : undefined}>
              <FieldLabel>Password</FieldLabel>
              <Input
                type="password"
                {...register("password")}
                aria-invalid={!!errors.password}
              />
              {errors.password && (
                <FieldDescription className="text-destructive">
                  {errors.password.message}
                </FieldDescription>
              )}
            </Field>

            <Field data-invalid={!!errors.handle ? "" : undefined}>
              <FieldLabel>Handle</FieldLabel>
              <Input
                placeholder="username"
                {...register("handle")}
                aria-invalid={!!errors.handle}
              />
              {errors.handle && (
                <FieldDescription className="text-destructive">
                  {errors.handle.message}
                </FieldDescription>
              )}
            </Field>

            <Field data-invalid={!!errors.display_name ? "" : undefined}>
              <FieldLabel>Display Name</FieldLabel>
              <Input
                placeholder="Jane Doe"
                {...register("display_name")}
                aria-invalid={!!errors.display_name}
              />
              {errors.display_name && (
                <FieldDescription className="text-destructive">
                  {errors.display_name.message}
                </FieldDescription>
              )}
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Creating account..." : "Sign up"}
          </Button>
          <div className="text-sm text-center text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Log in
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
