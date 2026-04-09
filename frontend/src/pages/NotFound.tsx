import { Link } from 'react-router-dom'

import { Button } from '../components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="text-center space-y-6">
        <div className="text-6xl font-semibold text-slate-700">404</div>
        <div className="text-lg text-slate-600">Stranica nije pronađena.</div>
        <Link to="/">
          <Button size="lg">Nazad na početnu</Button>
        </Link>
      </div>
    </div>
  )
}
