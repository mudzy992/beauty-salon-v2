import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'

import { AppProviders } from './app/providers'
import { AppRouter } from './app/router'
import { SeoRouteDefaults } from './seo/SeoRouteDefaults'
import { useDocumentLang } from './seo/useDocumentLang'

export default function App() {
  useDocumentLang()

  return (
    <HelmetProvider>
      <AppProviders>
        <BrowserRouter>
          <SeoRouteDefaults />
          <AppRouter />
        </BrowserRouter>
      </AppProviders>
    </HelmetProvider>
  )
}
