import { LegalPage, Section } from "@/components/legal-page";
import { LEGAL } from "@/lib/legal";

export default function DeleteAccount() {
  return (
    <LegalPage title="Delete your Liftline account">
      <Section title="In the app">
        <ul>
          <li><b>Clients:</b> Profile → Delete account.</li>
          <li><b>Coaches:</b> Settings → Delete account. Cancel active client subscriptions first.</li>
        </ul>
        <p>Deletion is permanent and takes effect immediately for sign-in.</p>
      </Section>

      <Section title="Without the app">
        <p>Email <a href={`mailto:${LEGAL.privacyEmail}?subject=Delete%20my%20Liftline%20account`}>{LEGAL.privacyEmail}</a> from the address on your account with the subject &quot;Delete my Liftline account&quot;. We will confirm within 7 days.</p>
      </Section>

      <Section title="What is deleted">
        <p>Your profile, logs, check-ins, measurements, progress photos, food entries, messages, community posts and notifications are deleted within 30 days. Coach accounts also delete their templates, programs and uploaded media.</p>
      </Section>

      <Section title="What we keep">
        <p>Payment and tax records required by law (typically 7 years). Backups expire on a rolling basis within 90 days.</p>
      </Section>
    </LegalPage>
  );
}
