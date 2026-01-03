export default function PrivacyPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-8 font-bold text-4xl">Privacy Policy</h1>

      <div className="prose max-w-none space-y-6">
        <section>
          <h2 className="mb-4 font-semibold text-2xl">
            1. Information We Collect
          </h2>
          <p>
            When you use PlayerARC, we collect information necessary to provide
            our sports development tracking services, including:
          </p>
          <ul className="ml-6 list-disc space-y-2">
            <li>Account information (name, email, role)</li>
            <li>Organization and team details</li>
            <li>Player development data (with guardian consent for minors)</li>
            <li>Usage data to improve our services</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-4 font-semibold text-2xl">2. How We Use Data</h2>
          <p>We use your information to:</p>
          <ul className="ml-6 list-disc space-y-2">
            <li>Provide player development tracking services</li>
            <li>Enable communication between coaches and parents</li>
            <li>Generate AI-powered insights for player development</li>
            <li>Improve our platform and user experience</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-4 font-semibold text-2xl">
            3. Analytics & Tracking
          </h2>
          <p>
            We use <strong>PostHog</strong> (hosted in the EU, Frankfurt) for
            analytics to understand how our platform is used and improve user
            experience. PostHog collects:
          </p>
          <ul className="ml-6 list-disc space-y-2">
            <li>
              Page views and navigation patterns (to improve user experience)
            </li>
            <li>Session recordings (with form inputs masked for privacy)</li>
            <li>Feature usage statistics (to prioritize development)</li>
            <li>
              Technical information (browser type, device, for compatibility)
            </li>
          </ul>
          <p className="mt-4">
            <strong>Privacy Protections:</strong>
          </p>
          <ul className="ml-6 list-disc space-y-2">
            <li>All data is hosted in the EU (GDPR compliant)</li>
            <li>Form inputs are automatically masked in session recordings</li>
            <li>No personal data is shared with third parties</li>
            <li>You can opt out of analytics tracking at any time</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-4 font-semibold text-2xl">4. Data Security</h2>
          <p>
            We implement industry-standard security measures to protect your
            data, including:
          </p>
          <ul className="ml-6 list-disc space-y-2">
            <li>Encrypted data transmission (HTTPS)</li>
            <li>Secure authentication</li>
            <li>Regular security updates</li>
            <li>EU-based data hosting</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-4 font-semibold text-2xl">5. Children's Privacy</h2>
          <p>
            PlayerARC is designed for youth sports development. For users under
            18:
          </p>
          <ul className="ml-6 list-disc space-y-2">
            <li>Parental/guardian consent is required</li>
            <li>Limited data collection (only necessary for services)</li>
            <li>Parents can request data deletion at any time</li>
            <li>No marketing or third-party data sharing</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-4 font-semibold text-2xl">6. Your Rights (GDPR)</h2>
          <p>Under GDPR, you have the right to:</p>
          <ul className="ml-6 list-disc space-y-2">
            <li>Access your personal data</li>
            <li>Correct inaccurate data</li>
            <li>Request data deletion</li>
            <li>Export your data</li>
            <li>Opt out of analytics</li>
            <li>Withdraw consent at any time</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-4 font-semibold text-2xl">7. Contact Us</h2>
          <p>
            For privacy-related questions or to exercise your rights, contact us
            at:
          </p>
          <p className="mt-2">
            <strong>Email:</strong> privacy@playerarc.com
            <br />
            <strong>Address:</strong> [Your business address]
          </p>
        </section>

        <section>
          <p className="mt-8 text-muted-foreground text-sm">
            <strong>Last Updated:</strong> January 3, 2026
          </p>
        </section>
      </div>
    </div>
  );
}
