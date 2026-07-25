import React from 'react'
import { Link } from 'react-router'
import { useLanguage } from '../contexts/LanguageContext'

const PrivacyPage: React.FC = () => {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen pb-20 pt-12 px-5">
      <div className="container mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">{t('privacy.title')}</h1>
        <p className="text-muted-foreground mb-8 text-sm">{t('privacy.updated')}</p>
        <div className="space-y-5 text-sm text-muted-foreground leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-foreground font-semibold text-base">1. {t('privacy.s1')}</h2>
            <p>{t('privacy.p1')}</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-foreground font-semibold text-base">2. {t('privacy.s2')}</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Të dhëna llogarie: emër, email, telefon (opsional)</li>
              <li>Ticket-e, termine, preferenca njoftimesh</li>
              <li>Telegram Chat ID nëse e lidh vetë</li>
              <li>Të dhëna teknike (IP/log) për siguri dhe stabilitet</li>
            </ul>
          </section>
          <section className="space-y-2">
            <h2 className="text-foreground font-semibold text-base">3. {t('privacy.s3')}</h2>
            <p>{t('privacy.p3')}</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-foreground font-semibold text-base">4. {t('privacy.s4')}</h2>
            <p>{t('privacy.p4')}</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-foreground font-semibold text-base">5. {t('privacy.s5')}</h2>
            <p>
              {t('privacy.p5')}{' '}
              <a className="text-primary" href="mailto:privacy@smartqueue.ks">
                privacy@smartqueue.ks
              </a>
            </p>
          </section>
          <section className="space-y-2">
            <h2 className="text-foreground font-semibold text-base">6. {t('privacy.s6')}</h2>
            <p>{t('privacy.p6')}</p>
          </section>
          <p>
            <Link className="text-primary" to="/terms">
              {t('privacy.seeTerms')}
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  )
}

export default PrivacyPage
