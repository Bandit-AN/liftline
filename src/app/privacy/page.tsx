import Link from "next/link";
import { LegalPage, Section } from "@/components/legal-page";
import { LEGAL } from "@/lib/legal";

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        Liftline is operated by {LEGAL.company} (&quot;we&quot;, &quot;us&quot;). Liftline connects fitness coaches with their clients. This policy explains what we collect, why, who we share it with, and the choices you have. It applies to the Liftline website and the iOS and Android apps.
      </p>

      <Section title="What we collect">
        <ul>
          <li><b>Account details:</b> name, email address, password (stored hashed by our authentication provider), role (coach or client), and profile settings.</li>
          <li><b>Health and fitness data you enter:</b> body weight and measurements, progress photos, workouts and lifts logged, food diary entries and nutrition targets, habits, and weekly check-in answers (which may include sleep, stress, energy, mood, injuries or other wellbeing notes).</li>
          <li><b>Food photos for scanning:</b> if you use Scan food, the photo is sent for analysis to produce a nutrition estimate. We do not keep the photo after analysis.</li>
          <li><b>Communications:</b> messages between coaches and clients, community group posts, and satisfaction or feedback responses.</li>
          <li><b>Coach content:</b> programs, workout and nutrition templates, notes about clients (never shown to clients), and uploaded exercise videos or images.</li>
          <li><b>Payment information:</b> payments are processed by Stripe. We receive the payment status, amounts, and limited details such as card brand and last four digits. We never see or store full card numbers. Coaches provide identity and bank details directly to Stripe.</li>
          <li><b>Device and usage data:</b> device type, operating system, app version, push notification token, log data such as IP address and timestamps, and crash reports.</li>
        </ul>
      </Section>

      <Section title="How we use it">
        <ul>
          <li>To run the service: show plans, record progress, deliver messages and notifications, and let your coach review your data.</li>
          <li>To process subscriptions, invoices and coach payouts.</li>
          <li>To provide AI food-photo nutrition estimates when you request them.</li>
          <li>To produce analytics for coaches about their own clients and programs.</li>
          <li>To secure the service, prevent fraud and abuse, fix bugs, and meet legal obligations.</li>
        </ul>
        <p>We do <b>not</b> sell your personal information, share it for cross-context behavioral advertising, or use your health data for advertising.</p>
      </Section>

      <Section title="Who can see your data">
        <ul>
          <li><b>Your coach</b> can see everything you log in Liftline, including check-ins, photos, measurements, food and messages. Clients only ever see their own data.</li>
          <li><b>Community group members</b> see what you post in groups you belong to.</li>
          <li><b>Service providers</b> that process data on our behalf under contract: Supabase (database, authentication, file storage), Stripe (payments), Anthropic (AI food-photo analysis; photos are not used to train models), Apple and Google (push notifications and app distribution), and our web hosting and email providers.</li>
          <li><b>Legal reasons:</b> when required by law, or to protect the rights and safety of users and others.</li>
          <li><b>Business transfers:</b> if we are involved in a merger or acquisition, subject to this policy.</li>
        </ul>
      </Section>

      <Section title="Security">
        <p>Data is encrypted in transit and at rest. Access is enforced at the database level so coaches can only reach their own clients&apos; data. Progress photos and exercise media are kept in private storage and served through short-lived links. No system is perfectly secure; please use a strong, unique password.</p>
      </Section>

      <Section title="Retention">
        <p>We keep your data while your account is active. When you delete your account, we delete your personal data within 30 days, except records we must keep by law (for example, payment and tax records, typically kept for 7 years) and backups that expire on a rolling basis within 90 days.</p>
      </Section>

      <Section title="Your choices and rights">
        <ul>
          <li>Access, correct or download your data, and delete your account at any time in the app (Profile or Settings → Delete account) or as described on our <Link href="/delete-account">account deletion page</Link>.</li>
          <li>Turn push notifications off in your device settings.</li>
          <li>Depending on where you live (for example, California, Washington, the EU/UK, or Canada), you may have additional rights to know, access, correct, delete or port your data, to object to or restrict processing, and to withdraw consent. We do not discriminate against you for using these rights.</li>
          <li>Washington and Nevada residents: we collect consumer health data only to provide the service you request, and we do not sell it.</li>
        </ul>
        <p>To make a request, email <a href={`mailto:${LEGAL.privacyEmail}`}>{LEGAL.privacyEmail}</a>. We will verify your identity and respond within the time required by law. If you are a client, some requests may also be passed to your coach.</p>
      </Section>

      <Section title="Legal bases (EU/UK users)">
        <p>We process data to perform our contract with you, with your explicit consent for health data (which you can withdraw by deleting the data or your account), for our legitimate interests in securing and improving the service, and to meet legal obligations. Data may be processed in the United States and Canada under appropriate safeguards.</p>
      </Section>

      <Section title="Children">
        <p>Liftline is not intended for anyone under 16, and we do not knowingly collect data from children under 13. If you believe a child has given us data, contact us and we will delete it.</p>
      </Section>

      <Section title="Not medical advice">
        <p>Liftline and AI nutrition estimates are tools, not medical advice. Talk to a qualified healthcare professional before starting a new training or nutrition program.</p>
      </Section>

      <Section title="Changes and contact">
        <p>We will notify you in the app or by email before material changes take effect. Questions: <a href={`mailto:${LEGAL.privacyEmail}`}>{LEGAL.privacyEmail}</a>, {LEGAL.company}, {LEGAL.address}.</p>
      </Section>
    </LegalPage>
  );
}
