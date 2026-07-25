import React from 'react'
import { Link } from 'react-router'

const PrivacyPage: React.FC = () => (
  <div className="min-h-screen pb-20 pt-12 px-5">
    <div className="container mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">Politika e Privatësisë</h1>
      <p className="text-muted-foreground mb-8 text-sm">SmartQueue Kosova · përditësuar Korrik 2026</p>
      <div className="space-y-5 text-sm text-muted-foreground leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-foreground font-semibold text-base">1. Kush jemi</h2>
          <p>
            SmartQueue Kosova është platformë digjitale për menaxhimin e radhëve dhe termineve në
            institucione publike e private në Republikën e Kosovës.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-foreground font-semibold text-base">2. Çfarë mbledhim</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Të dhëna llogarie: emër, email, telefon (opsional)</li>
            <li>Ticket-e, termine, preferenca njoftimesh</li>
            <li>Telegram Chat ID nëse e lidh vetë</li>
            <li>Të dhëna teknike (IP/log) për siguri dhe stabilitet</li>
          </ul>
        </section>
        <section className="space-y-2">
          <h2 className="text-foreground font-semibold text-base">3. Pse i përdorim</h2>
          <p>
            Për ofrimin e shërbimit (radhë, termine, njoftime), përmirësim të sistemit dhe
            mbrojtje nga abuzimi. Nuk i shesim të dhënat te palë të treta.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-foreground font-semibold text-base">4. Njoftimet</h2>
          <p>
            SMS, email dhe Telegram dërgohen vetëm sipas preferencave në Cilësime ose kur janë
            të nevojshme për konfirmim termini.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-foreground font-semibold text-base">5. Të drejtat e tua (LPDP)</h2>
          <p>
            Mund të kërkosh qasje, korrigjim ose fshirje të llogarisë nga Cilësimet → «Fshi
            llogarinë», ose duke kontaktuar{' '}
            <a className="text-primary" href="mailto:privacy@smartqueue.ks">
              privacy@smartqueue.ks
            </a>
            .
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-foreground font-semibold text-base">6. Ruajtja</h2>
          <p>
            Të dhënat ruhen për sa kohë llogaria është aktive dhe për periudha ligjore të
            nevojshme. Pas fshirjes, ticket-et aktive anulohen.
          </p>
        </section>
        <p>
          Shih edhe{' '}
          <Link className="text-primary" to="/terms">
            Kushtet e Përdorimit
          </Link>
          .
        </p>
      </div>
    </div>
  </div>
)

export default PrivacyPage
