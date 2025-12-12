"use client";

import { api } from "@pdp/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { FloatingHeader } from "@/components/landing/floating-header";
import { LandingFooter } from "@/components/landing/landing-footer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Validation functions
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone: string): boolean => {
  if (!phone || phone.trim() === "") return true; // Optional field

  // Extract digits only - this is the primary validation
  const digitsOnly = phone.replace(/\D/g, "");

  // Must have between 7 and 15 digits (international standard)
  // This is the strict check - no phone number should have fewer than 7 digits
  if (digitsOnly.length < 7 || digitsOnly.length > 15) {
    return false;
  }

  // Additional format validation for UK/Irish and international formats
  // UK formats: +44, 0044, 0 prefix (e.g., +44 7700 900000, 07700 900000)
  // Irish formats: +353, 00353, 0 prefix (e.g., +353 1 234 5678, 01 234 5678)
  // International: +country code (e.g., +1 555 123 4567)
  const phoneRegex = /^(\+?\d{1,4}[\s-]?)?(\(?\d{1,4}\)?[\s-]?)?[\d\s\-()]+$/;

  // Both digit count (already checked above) and format must be valid
  return phoneRegex.test(phone);
};

export default function DemoPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    organization: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    phone?: string;
  }>({});

  const createDemoRequest = useMutation(api.models.demoAsks.createDemoRequest);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // Validate email
    if (!validateEmail(formData.email)) {
      setFieldErrors({ email: "Please enter a valid email address" });
      return;
    }

    // Validate phone if provided
    if (formData.phone && !validatePhone(formData.phone)) {
      setFieldErrors({
        phone:
          "Please enter a valid phone number (UK/Irish or international format)",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await createDemoRequest({
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        organization: formData.organization || undefined,
        message: formData.message || undefined,
      });
      setIsSuccess(true);
      setFormData({
        name: "",
        email: "",
        phone: "",
        organization: "",
        message: "",
      });
      setFieldErrors({});
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to submit request. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear field errors when user starts typing
    if (fieldErrors[name as keyof typeof fieldErrors]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name as keyof typeof newErrors];
        return newErrors;
      });
    }
  };

  const handleBlur = (field: "email" | "phone") => {
    if (field === "email" && formData.email && !validateEmail(formData.email)) {
      setFieldErrors((prev) => ({
        ...prev,
        email: "Please enter a valid email address",
      }));
    } else if (
      field === "phone" &&
      formData.phone &&
      !validatePhone(formData.phone)
    ) {
      setFieldErrors((prev) => ({
        ...prev,
        phone:
          "Please enter a valid phone number (UK/Irish or international format)",
      }));
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <FloatingHeader />
      <main className="flex-1 bg-gradient-to-b from-white to-[#F7FAF7] py-20">
        <div className="mx-auto max-w-4xl px-4">
          {/* Header */}
          <div className="mb-12 text-center">
            <h1 className="mb-4 font-bold text-4xl text-[#1E3A5F] sm:text-5xl">
              Request a Demo
            </h1>
            <p className="mx-auto max-w-3xl text-gray-600 text-lg">
              See how PlayerARC can transform player development for your club or
              organisation. Get a personalised walkthrough of our platform.
            </p>
            {/* Back to Home Button */}
            <div className="mt-8">
              <Button
                asChild
                className="group bg-[#1E3A5F] text-white transition-all hover:bg-[#1E3A5F]/90"
              >
                <Link href="/">
                  <ArrowLeft className="group-hover:-translate-x-1 mr-2 h-4 w-4 transition-transform" />
                  Back to Home
                </Link>
              </Button>
            </div>
          </div>

          {/* Error Message */}
          {error && !isSuccess && (
            <Card className="mb-8 border-2 border-red-200 bg-red-50">
              <CardContent className="p-6">
                <p className="text-red-600 text-sm">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Success Confirmation - Replaces Form */}
          {isSuccess ? (
            <Card className="mb-12 border-2 border-[#27AE60] bg-gradient-to-br from-[#27AE60]/5 via-white to-[#1E3A5F]/5">
              <CardContent className="p-12 text-center">
                {/* Checkmark */}
                <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-[#27AE60] shadow-lg">
                  <CheckCircle2 className="h-12 w-12 text-white" />
                </div>

                {/* Success Message */}
                <h2 className="mb-4 font-bold text-3xl text-[#1E3A5F] sm:text-4xl">
                  Request Submitted Successfully!
                </h2>
                <p className="mx-auto mb-2 max-w-2xl text-gray-700 text-lg leading-relaxed">
                  Thank you for your interest in PlayerARC. We&apos;ve received your
                  demo request and will be in touch soon to schedule your
                  personalised walkthrough.
                </p>
                <p className="mx-auto mb-10 max-w-2xl text-base text-gray-600">
                  Our team will contact you within 24-48 hours to arrange a time
                  that works for you.
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
                  <Button
                    asChild
                    className="group bg-[#F39C12] px-8 py-6 font-semibold text-lg text-white transition-all hover:bg-[#E67E22] hover:shadow-[#F39C12]/50 hover:shadow-lg"
                    size="lg"
                  >
                    <Link href="/">
                      Return to Home
                      <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </Button>
                  <Button
                    className="border-2 border-[#1E3A5F] bg-transparent px-8 py-6 font-semibold text-[#1E3A5F] text-lg transition-all hover:bg-[#1E3A5F] hover:text-white"
                    onClick={() => {
                      setIsSuccess(false);
                      setFormData({
                        name: "",
                        email: "",
                        phone: "",
                        organization: "",
                        message: "",
                      });
                      setError(null);
                    }}
                    size="lg"
                    variant="outline"
                  >
                    Request Another Demo
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Form Card */
            <Card className="mb-12 border-2 border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="text-2xl text-[#1E3A5F]">
                  Demo Request Form
                </CardTitle>
                <CardDescription className="text-base text-gray-600">
                  Fill out the form below and we&apos;ll get in touch to
                  schedule your personalised demo.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-6" onSubmit={handleSubmit}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        className="mb-2 block font-medium text-[#1E3A5F] text-sm"
                        htmlFor="name"
                      >
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        className="w-full rounded-md border-2 border-gray-200 bg-white px-4 py-2.5 text-gray-900 transition-colors focus:border-[#27AE60] focus:outline-none focus:ring-2 focus:ring-[#27AE60]/20"
                        id="name"
                        name="name"
                        onChange={handleChange}
                        required
                        type="text"
                        value={formData.name}
                      />
                    </div>
                    <div>
                      <label
                        className="mb-2 block font-medium text-[#1E3A5F] text-sm"
                        htmlFor="email"
                      >
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        className={`w-full rounded-md border-2 bg-white px-4 py-2.5 text-gray-900 transition-colors focus:outline-none focus:ring-2 ${
                          fieldErrors.email
                            ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                            : "border-gray-200 focus:border-[#27AE60] focus:ring-[#27AE60]/20"
                        }`}
                        id="email"
                        name="email"
                        onBlur={() => handleBlur("email")}
                        onChange={handleChange}
                        required
                        type="email"
                        value={formData.email}
                      />
                      {fieldErrors.email && (
                        <p className="mt-1 text-red-600 text-xs">
                          {fieldErrors.email}
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label
                      className="mb-2 block font-medium text-[#1E3A5F] text-sm"
                      htmlFor="phone"
                    >
                      Phone Number
                    </label>
                    <input
                      className={`w-full rounded-md border-2 bg-white px-4 py-2.5 text-gray-900 transition-colors focus:outline-none focus:ring-2 ${
                        fieldErrors.phone
                          ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                          : "border-gray-200 focus:border-[#27AE60] focus:ring-[#27AE60]/20"
                      }`}
                      id="phone"
                      name="phone"
                      onBlur={() => handleBlur("phone")}
                      onChange={handleChange}
                      placeholder="+44 7700 900000 or 07700 900000"
                      type="tel"
                      value={formData.phone}
                    />
                    {fieldErrors.phone && (
                      <p className="mt-1 text-red-600 text-xs">
                        {fieldErrors.phone}
                      </p>
                    )}
                    {!fieldErrors.phone && formData.phone && (
                      <p className="mt-1 text-gray-500 text-xs">
                        UK/Irish format: +44 or 0 prefix. International:
                        +country code
                      </p>
                    )}
                  </div>
                  <div>
                    <label
                      className="mb-2 block font-medium text-[#1E3A5F] text-sm"
                      htmlFor="organization"
                    >
                      Organisation/Club
                    </label>
                    <input
                      className="w-full rounded-md border-2 border-gray-200 bg-white px-4 py-2.5 text-gray-900 transition-colors focus:border-[#27AE60] focus:outline-none focus:ring-2 focus:ring-[#27AE60]/20"
                      id="organization"
                      name="organization"
                      onChange={handleChange}
                      type="text"
                      value={formData.organization}
                    />
                  </div>
                  <div>
                    <label
                      className="mb-2 block font-medium text-[#1E3A5F] text-sm"
                      htmlFor="message"
                    >
                      Message (Optional)
                    </label>
                    <textarea
                      className="w-full rounded-md border-2 border-gray-200 bg-white px-4 py-2.5 text-gray-900 transition-colors focus:border-[#27AE60] focus:outline-none focus:ring-2 focus:ring-[#27AE60]/20"
                      id="message"
                      name="message"
                      onChange={handleChange}
                      rows={4}
                      value={formData.message}
                    />
                  </div>
                  <Button
                    className="group w-full bg-[#F39C12] px-8 py-6 font-semibold text-lg text-white transition-all hover:bg-[#E67E22] hover:shadow-[#F39C12]/50 hover:shadow-lg"
                    disabled={isSubmitting}
                    size="lg"
                    type="submit"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        Request Demo
                        <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Benefits Grid - Only show when form is visible */}
          {!isSuccess && (
            <>
              <div className="mb-12 grid gap-4 sm:grid-cols-3">
                <div className="flex items-center gap-3 rounded-lg border-2 border-gray-200 bg-white p-4">
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-[#27AE60]" />
                  <span className="font-medium text-gray-700 text-sm">
                    Personalised walkthrough
                  </span>
                </div>
                <div className="flex items-center gap-3 rounded-lg border-2 border-gray-200 bg-white p-4">
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-[#27AE60]" />
                  <span className="font-medium text-gray-700 text-sm">
                    See real features in action
                  </span>
                </div>
                <div className="flex items-center gap-3 rounded-lg border-2 border-gray-200 bg-white p-4">
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-[#27AE60]" />
                  <span className="font-medium text-gray-700 text-sm">
                    No commitment required
                  </span>
                </div>
              </div>

              {/* Login Link */}
              <div className="text-center">
                <p className="text-gray-600 text-sm">
                  Already have an account?{" "}
                  <Link
                    className="font-semibold text-[#27AE60] transition-colors hover:text-[#1E3A5F] hover:underline"
                    href="/login"
                  >
                    Login here
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
