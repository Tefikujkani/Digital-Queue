import React from 'react'
import { Link } from 'react-router'

const TermsPage: React.FC = () => (
  <div className="min-h-screen pb-20 pt-12 px-5">
    <div className="container mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">Kushtet e Përdorimit</h1>
      <p className="text-muted-foreground mb-8 text-sm">SmartQueue Kosova · përditësuar Korrik 2026</p>
      <div className="space-y-5 text-sm text-muted-foreground leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-foreground font-semibold text-base">1. Pranimi</h2>
          <p>
            Duke përdorur SmartQueue, pranon këto kushte. Nëse nuk pajtohesh, mos e përdor
            platformën.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-foreground font-semibold text-base">2. Llogaria</h2>
          <p>
            Je përgjegjës për sigurinë e fjalëkalimit dhe aktivitetin në llogarinë tënde. Mos
            ndaj kredencialet me të tjerë.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-foreground font-semibold text-base">3. Përdorimi i saktë</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Mos rezervoni termine të rreme ose abuzive</li>
            <li>Mos tentoni të hyni si admin pa autorizim</li>
            <li>Respektoni oraret dhe rregullat e institucionit</li>
          </ul>
        </section>
        <section className="space-y-2">
          <h2 className="text-foreground font-semibold text-base">4. Ticket & QR</h2>
          <p>
            Bileta digjitale dhe QR janë personale. Check-in bëhet nga stafi i institucionit.
            Abuzimi mund të çojë në pezullim të llogarisë.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-foreground font-semibold text-base">5. Disponueshmëria</h2>
          <p>
            Synojmë shërbim të vazhdueshëm, por nuk garantojmë 100% uptime. Mirëmbajtja mund të
            ndërpresë përkohësisht shërbimin.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-foreground font-semibold text-base">6. Ligji</h2>
          <p>
            Këto kushte interpretohen sipas ligjeve të Republikës së Kosovës. Për privatësi shih{' '}
            <Link className="text-primary" to="/privacy">
              Politikën e Privatësisë
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  </div>
)

export default TermsPage
