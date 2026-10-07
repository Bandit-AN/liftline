import Link from "next/link";
import { LegalPage, Section } from "@/components/legal-page";
import { LEGAL } from "@/lib/legal";

export default function Terms() {
  return (
    <LegalPage title="Terms of Service">
      <p>
        These terms are an agreement between you and {LEGAL.company} for use of Liftline. By creating an account or using the apps you agree to them and to our <Link href="/privacy">Privacy Policy</Link>. Coaches also agree to the <Link href="/coach-terms">Coach Agreement</Link>.
      </p>

      <Section title="The service">
        <p>Liftline is software that lets independent fitness coaches deliver programs, nutrition guidance, check-ins and messaging to their clients. <b>Coaches are independent professionals, not our employees or agents.</b> We do not provide coaching ourselves and are not responsible for the advice a coach gives.</p>
      </Section>

      <Section title="Eligibility and accounts">
        <p>You must be at least 16 (or the age of majority where you live, if you are paying). Keep your login secure and give accurate information. You are responsible for activity on your account.</p>
      </Section>

      <Section title="Health and safety">
        <p><b>Liftline is not a medical service.</b> Exercise and diet changes carry risk. Consult a physician before starting any program, stop if you feel pain, dizziness or shortness of breath, and seek emergency care when needed. Messages to your coach are not monitored for emergencies. AI food estimates are approximate and may be wrong.</p>
      </Section>

      <Section title="Payments">
        <ul>
          <li>Coaching is purchased on the Liftline website through invoices or subscriptions, processed by Stripe. Prices are set by your coach. Liftline collects payment on the coach&apos;s behalf.</li>
          <li>Subscriptions renew automatically until cancelled. You can cancel any time from the billing link in your receipt or account; access continues to the end of the paid period.</li>
          <li>Refunds are at your coach&apos;s discretion unless required by law. Contact your coach first; if unresolved, contact us at <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.</li>
          <li>If a payment fails, your coach may pause access until it is resolved.</li>
        </ul>
      </Section>

      <Section title="Acceptable use">
        <p>Do not harass others, post unlawful, hateful or sexual content, impersonate anyone, share someone else&apos;s data without permission, attempt to access accounts or data that are not yours, reverse engineer or overload the service, or use it to sell prohibited substances. We may remove content or suspend accounts that break these rules.</p>
      </Section>

      <Section title="Your content">
        <p>You own what you upload. You give us a limited license to host, process and display it only to operate Liftline for you and the people you share it with. Coaches own their programs and templates.</p>
      </Section>

      <Section title="Ending your account">
        <p>You can delete your account at any time (<Link href="/delete-account">how</Link>). We may suspend or end accounts that violate these terms. Sections that by nature should survive (payments owed, disclaimers, liability limits, disputes) continue after termination.</p>
      </Section>

      <Section title="Disclaimers and liability">
        <p>The service is provided &quot;as is&quot; without warranties of any kind, to the extent permitted by law. We are not liable for injury, health outcomes, or the acts of coaches or other users. To the extent permitted by law, our total liability for any claim is limited to the greater of the amount you paid us in the 12 months before the claim or $100, and we are not liable for indirect or consequential damages. Some jurisdictions do not allow these limits, so they may not apply to you.</p>
      </Section>

      <Section title="Disputes">
        <p>These terms are governed by the laws of {LEGAL.governingState}, USA, without regard to conflict-of-law rules. Before filing a claim, contact us and give us 30 days to try to resolve it. Claims will be brought in the state or federal courts located in {LEGAL.governingState}, unless the law where you live gives you the right to sue locally.</p>
      </Section>

      <Section title="App stores">
        <p>If you downloaded Liftline from Apple&apos;s App Store or Google Play, these terms are between you and us, not Apple or Google. Apple and its subsidiaries are third-party beneficiaries of these terms and may enforce them. Apple has no obligation to provide support or maintenance for the app.</p>
      </Section>

      <Section title="Changes and contact">
        <p>We will give notice in the app or by email before material changes. Continuing to use Liftline after they take effect means you accept them. Contact: <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>, {LEGAL.company}, {LEGAL.address}.</p>
      </Section>
    </LegalPage>
  );
}
