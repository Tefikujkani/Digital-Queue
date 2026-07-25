import React from 'react'
import { Link } from 'react-router'

const TermsPage: React.FC = () => (
  <div className="min-h-screen pb-20 pt-12 px-5">
    <div className="container mx-auto max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">Kushtet e Përdorimit</h1>
      <p className="text-muted-foreground mb-8 text-sm">SmartQueue Kosova · 2026</p>
      <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
        <p>
          Duke përdorur SmartQueue, pranoni të përdorni platformën në mënyrë të ligjshme, të mos
          abuzoni me prioritetet e radhës dhe të jepni të dhëna të sakta.
        </p>
        <p>
          Numri digjital dhe termini janë të vlefshëm sipas rregullave të institucionit përkatës.
          Mosparaqitja mund të çojë në anulim të ticket-it.
        </p>
        <p>
          Platforma ofrohet “siç është” për lehtësimin e radhëve; institucionet mbeten përgjegjëse
          për shërbimin final.
        </p>
        <p>
          Lexo edhe{' '}
          <Link className="text-primary" to="/privacy">
            Privatësinë
          </Link>{' '}
          dhe{' '}
          <Link className="text-primary" to="/help">
            Ndihmën
          </Link>
          .
        </p>
      </div>
    </div>
  </div>
)

export default TermsPage
