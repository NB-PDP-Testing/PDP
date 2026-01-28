"use client";

/**
 * HelpFooter - Help section for onboarding modals
 *
 * Displays contact support link at the bottom of onboarding steps.
 * Provides users a way to get help if they encounter issues.
 */

type HelpFooterProps = {
  supportEmail?: string;
};

/**
 * Help footer component for onboarding modals
 *
 * Renders a separator line with help links at the bottom of modals.
 */
export function HelpFooter({
  supportEmail = "support@playerarc.com",
}: HelpFooterProps) {
  return (
    <div className="mt-4 border-t pt-4 text-center text-muted-foreground text-sm">
      <p>
        Need help?{" "}
        <a
          className="underline hover:text-foreground"
          href={`mailto:${supportEmail}`}
        >
          Contact Support
        </a>
      </p>
    </div>
  );
}
