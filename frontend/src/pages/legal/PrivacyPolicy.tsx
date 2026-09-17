export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-12 space-y-8">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg">
              M
            </div>
            <h1 className="text-3xl font-bold text-slate-900">MailFlow</h1>
          </div>
          <h2 className="text-xl font-semibold text-slate-700 mt-4">Privacy Policy</h2>
          <p className="text-sm text-slate-500 mt-1">Last Updated: September 18, 2026</p>
        </div>

        <section className="space-y-3 text-slate-600 text-sm leading-relaxed">
          <h3 className="text-base font-bold text-slate-900">1. Introduction</h3>
          <p>
            MailFlow (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting
            your privacy. This Privacy Policy explains how our marketing automation and WhatsApp
            outreach platform collects, uses, discloses, and protects your information when you use
            our services.
          </p>
        </section>

        <section className="space-y-3 text-slate-600 text-sm leading-relaxed">
          <h3 className="text-base font-bold text-slate-900">2. Information We Collect</h3>
          <p>
            We collect information necessary to provide our communication and outreach services:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>
              <strong>Account Data:</strong> Name, business email, organization name, and
              authentication credentials.
            </li>
            <li>
              <strong>WhatsApp Integration Data:</strong> Meta Business Account ID, WhatsApp
              Business Account (WABA) ID, Phone Number ID, and API access tokens used exclusively to
              route your approved messages.
            </li>
            <li>
              <strong>Campaign & Contact Data:</strong> Lead phone numbers, recipient names, custom
              variables, and message template content uploaded for dispatch.
            </li>
            <li>
              <strong>Delivery Metrics:</strong> Status updates, delivery timestamps, read receipts,
              and error codes returned by the WhatsApp Cloud API.
            </li>
          </ul>
        </section>

        <section className="space-y-3 text-slate-600 text-sm leading-relaxed">
          <h3 className="text-base font-bold text-slate-900">3. How We Use Your Data</h3>
          <p>
            Your information is used strictly to provide, maintain, and improve our services,
            including:
          </p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Dispatching WhatsApp and Email outreach campaigns on your behalf.</li>
            <li>Providing real-time delivery logs, analytics, and read receipt tracking.</li>
            <li>Authenticating your business account with Meta Cloud API.</li>
          </ul>
          <p>
            We do <strong>not</strong> sell, rent, or trade your personal data or your
            contacts&apos; phone numbers to third parties or data brokers.
          </p>
        </section>

        <section className="space-y-3 text-slate-600 text-sm leading-relaxed">
          <h3 className="text-base font-bold text-slate-900">
            4. Meta WhatsApp Cloud API Compliance
          </h3>
          <p>
            MailFlow adheres to Meta&apos;s WhatsApp Business Terms of Service and Data Policy.
            Access tokens and business account credentials are encrypted at rest using AES-256
            encryption. We process message payloads solely for delivery and queue management.
          </p>
        </section>

        <section className="space-y-3 text-slate-600 text-sm leading-relaxed">
          <h3 className="text-base font-bold text-slate-900">5. Data Retention and Deletion</h3>
          <p>
            We retain your campaign records as long as your account remains active. You may request
            deletion of your account and associated credentials at any time by navigating to
            Settings &gt; Disconnect WhatsApp, or by contacting our privacy team. Upon account
            deletion, all stored tokens and recipient logs are permanently purged from our
            databases.
          </p>
        </section>

        <section className="space-y-3 text-slate-600 text-sm leading-relaxed">
          <h3 className="text-base font-bold text-slate-900">6. Contact Information</h3>
          <p>
            If you have questions or concerns about this Privacy Policy, please contact our privacy
            officer at:
            <br />
            <strong>Email:</strong> support@mailflow.com
          </p>
        </section>

        <div className="pt-4 border-t border-slate-200 text-xs text-slate-400">
          &copy; {new Date().getFullYear()} MailFlow. All rights reserved.
        </div>
      </div>
    </div>
  );
}
