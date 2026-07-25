import React from 'react'
import { Link } from 'react-router'
import { useLanguage } from '../contexts/LanguageContext'

const TermsPage: React.FC = () => {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen pb-20 pt-12 px-5">
      <div className="container mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">{t('terms.title')}</h1>
        <p className="text-muted-foreground mb-8 text-sm">{t('terms.updated')}</p>
        <div className="space-y-5 text-sm text-muted-foreground leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-foreground font-semibold text-base">1. {t('terms.s1')}</h2>
            <p>{t('terms.p1')}</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-foreground font-semibold text-base">2. {t('terms.s2')}</h2>
            <p>{t('terms.p2')}</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-foreground font-semibold text-base">3. {t('terms.s3')}</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Mos rezervoni termine të rreme ose abuzive</li>
              <li>Mos tentoni të hyni si admin pa autorizim</li>
              <li>Respektoni oraret dhe rregullat e institucionit</li>
            </ul>
          </section>
          <section className="space-y-2">
            <h2 className="text-foreground font-semibold text-base">4. {t('terms.s4')}</h2>
            <p>{t('terms.p4')}</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-foreground font-semibold text-base">5. {t('terms.s5')}</h2>
            <p>{t('terms.p5')}</p>
          </section>
          <section className="space-y-2">
            <h2 className="text-foreground font-semibold text-base">6. {t('terms.s6')}</h2>
            <p>
              {t('terms.p6')}{' '}
              <Link className="text-primary" to="/privacy">
                {t('privacy.title')}
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}

export default TermsPage
