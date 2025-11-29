import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import z from "zod";
import { authClient } from "@/lib/auth-client";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export default function SignInForm() {
  const router = useRouter();

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      await authClient.signIn.email(
        {
          email: value.email,
          password: value.password,
        },
        {
          onSuccess: () => {
            router.push("/orgs/current");
            toast.success("Welcome back! Let's get to work.");
          },
          onError: (error) => {
            toast.error(
              error.error.message ||
                error.error.statusText ||
                "Unable to sign in. Please check your credentials."
            );
          },
        }
      );
    },
    validators: {
      onSubmit: z.object({
        email: z.string().email("Please enter a valid email address"),
        password: z.string().min(8, "Password must be at least 8 characters"),
      }),
    },
  });

  const signInWithGoogle = async () => {
    await authClient.signIn.social(
      {
        provider: "google",
        callbackURL: "/orgs/current",
      },
      {
        onError: (error: {
          error: { message?: string; statusText?: string };
        }) => {
          toast.error(
            error.error.message ||
              error.error.statusText ||
              "Unable to sign in with Google. Please try again."
          );
        },
      }
    );
  };

  const signInWithMicrosoft = async () => {
    await authClient.signIn.social(
      {
        provider: "microsoft",
        callbackURL: "/orgs/current",
      },
      {
        onError: (error: {
          error: { message?: string; statusText?: string };
        }) => {
          toast.error(
            error.error.message ||
              error.error.statusText ||
              "Unable to sign in with Microsoft. Please try again."
          );
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 px-4 py-12">
      <div className="mx-auto w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="font-bold text-3xl tracking-tight sm:text-4xl">
            Welcome to PDP
          </h1>
          <p className="mt-2 font-medium text-base sm:text-lg">
            Player Development Passport System
          </p>
          <p className="mt-2 text-primary text-sm italic">
            "As many as possible, for as long as possible..."
          </p>
        </div>

        {/* Mission Statement */}
        <div className="rounded-lg border-2 border-primary/30 bg-gradient-to-r from-primary/10 to-primary/5 p-4 shadow-sm">
          <p className="text-foreground text-sm leading-relaxed">
            Player Development Passport (PDP) is a comprehensive digital
            ecosystem where parents and coaches collaborate to support and
            manage a child's sporting development. Each player has a personal
            "passport" that follows them throughout their time with a
            club/sport.
          </p>
        </div>

        {/* Card Container */}
        <div className="space-y-5 rounded-lg border bg-card p-6 shadow-lg sm:p-8">
          {/* Sign In Header */}
          <div className="text-center">
            <h2 className="font-bold text-2xl">Sign In</h2>
            <p className="mt-1 text-muted-foreground text-sm">
              Access your PDP account
            </p>
          </div>

          {/* Sign Up Link - Above Form */}
          <div className="rounded-lg border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 text-center shadow-sm dark:border-blue-800 dark:from-blue-950/50 dark:to-indigo-950/50">
            <p className="text-sm">
              <span className="text-muted-foreground">
                Don't have an account?{" "}
              </span>
              <a
                className="font-bold text-blue-600 hover:underline dark:text-blue-400"
                href="/signup"
              >
                Sign up
              </a>
            </p>
          </div>
          {/* Social Login Buttons */}
          <div className="space-y-3">
            <Button
              className="w-full"
              onClick={signInWithGoogle}
              size="lg"
              variant="outline"
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Sign in with Google
            </Button>
            <Button
              className="w-full"
              onClick={signInWithMicrosoft}
              size="lg"
              variant="outline"
            >
              <svg className="mr-2 h-5 w-5" fill="#00A4EF" viewBox="0 0 24 24">
                <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z" />
              </svg>
              Sign in with Microsoft
            </Button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or sign in with email
              </span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <div>
              <form.Field name="email">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Email Address</Label>
                    <Input
                      autoComplete="email"
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="you@example.com"
                      type="email"
                      value={field.state.value}
                    />
                    {field.state.meta.errors.map((error) => (
                      <p
                        className="text-destructive text-sm"
                        key={error?.message}
                      >
                        {error?.message}
                      </p>
                    ))}
                  </div>
                )}
              </form.Field>
            </div>

            <div>
              <form.Field name="password">
                {(field) => (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={field.name}>Password</Label>
                      <a
                        className="text-primary text-sm hover:underline"
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          toast.info("Password reset feature coming soon!");
                        }}
                      >
                        Forgot password?
                      </a>
                    </div>
                    <Input
                      autoComplete="current-password"
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="••••••••"
                      type="password"
                      value={field.state.value}
                    />
                    {field.state.meta.errors.map((error) => (
                      <p
                        className="text-destructive text-sm"
                        key={error?.message}
                      >
                        {error?.message}
                      </p>
                    ))}
                  </div>
                )}
              </form.Field>
            </div>

            <form.Subscribe>
              {(state) => (
                <Button
                  className="w-full"
                  disabled={!state.canSubmit || state.isSubmitting}
                  size="lg"
                  type="submit"
                >
                  {state.isSubmitting ? "Signing in..." : "Sign In"}
                </Button>
              )}
            </form.Subscribe>
          </form>
        </div>
      </div>
    </div>
  );
}
