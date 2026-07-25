import React from 'react'
import { Link } from 'react-router'

const PrivacyPage: React.FC = () => (
  <div className="min-h-screen pb-20 pt-12 px-5">
    <div className="container mx-auto max-w-3xl prose prose-invert prose-sm">
      <h1 className="text-3xl font-bold mb-2">Politika e Privatësisë</h1>
      <p className="text-muted-foreground mb-8">SmartQueue Kosova · përditësuar 2026</p>
      <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
        <p>
          Ne mbledhim të dhëna të nevojshme për llogari (emër, email, telefon opsional), ticket-e,
          termine dhe preferenca njoftimesh, me qëllim ofrimin e shërbimit të radhës digjitale.
        </p>
        <p>
          Të dhënat ruhen në baza të sigurta dhe nuk shiten te palë të treta. SMS/email dërgohen
          vetëm sipas preferencave tuaja në Cilësime.
        </p>
        <p>
          Mund të kërkoni qasje ose fshirje të llogarisë duke kontaktuar{' '}
          <a className="text-primary" href="mailto:info@smartqueue.gov">
            info@smartqueue.gov
          </a>
          .
        </p>
        <p>
          Për pyetje ligjore shih edhe{' '}
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
