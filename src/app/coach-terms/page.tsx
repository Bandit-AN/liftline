import Link from "next/link";
import { LegalPage, Section } from "@/components/legal-page";
import { LEGAL } from "@/lib/legal";

export default function CoachTerms() {
  return (
    <LegalPage title="Coach Agreement">
      <p>
        This agreement applies to coaches using Liftline, in addition to the <Link href="/terms">Terms of Service</Link> and <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <Section title="Your business">
        <p>You are an independent business. You set your own prices, services and schedule, and you are solely responsible for the coaching you provide, your qualifications, any licenses or insurance your work requires, and your own taxes. You must not diagnose or treat medical conditions unless you are licensed to do so.</p>
      </Section>

      <Section title="Payments and platform fee">
        <ul>
          <li>Payments are processed through Stripe Connect. You must complete Stripe&apos;s onboarding and agree to the <a href="https://stripe.com/connect-account/legal" target="_blank" rel="noreferrer">Stripe Connected Account Agreement</a>.</li>
          <li>Liftline acts as your limited payment collection agent: when a client pays Liftline, your client has paid you.</li>
          <li>Liftline keeps a platform fee of <b>{LEGAL.platformFeePercent}%</b> of each payment. Stripe&apos;s processing fees are paid by you and deducted from your share. The balance is paid out to your Stripe account on Stripe&apos;s payout schedule.</li>
          <li>When a payment is successfully refunded or charged back, Liftline returns its platform fee on that payment, and the rest of the refunded amount (plus any dispute fees Stripe charges) is your responsibility. It is recorded as a negative balance and deducted from your future payouts. If you have no new sales within 30 days of the refund or chargeback, you agree to repay the outstanding balance, and we may charge it to your Stripe account or bank account on file.</li>
          <li>Payments for your coaching must go through Liftline invoicing for clients you manage in Liftline. You may not take payment inside the mobile apps outside this system.</li>
          <li>Stripe issues tax forms (such as 1099-K) where required.</li>
          <li>We will give at least 30 days&apos; notice before changing the platform fee.</li>
        </ul>
      </Section>

      <Section title="Client data">
        <p>You may use client data only to coach that client. Keep it confidential, do not export it to other systems without the client&apos;s consent, and do not sell or share it. If a client asks you to delete or correct their data, forward the request to us. When a client leaves you, you lose access to their account.</p>
      </Section>

      <Section title="Conduct">
        <p>Be professional and respectful. Respond to urgent safety concerns by directing clients to emergency services. Do not make false claims about results, and follow applicable advertising and consumer protection laws.</p>
      </Section>

      <Section title="Your content">
        <p>You keep ownership of your programs, templates and uploaded media, and you must have the rights to anything you upload. You grant us a license to host and display it to your clients to operate the service.</p>
      </Section>

      <Section title="Indemnity">
        <p>You agree to defend and indemnify {LEGAL.company} against claims arising from your coaching, your content, or your breach of this agreement.</p>
      </Section>

      <Section title="Ending">
        <p>You can stop using Liftline at any time; cancel active client subscriptions first. We may suspend coaches who break this agreement or Stripe&apos;s rules. Amounts already earned are paid out subject to refunds and disputes.</p>
      </Section>

      <Section title="Contact">
        <p><a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a></p>
      </Section>
    </LegalPage>
  );
}
