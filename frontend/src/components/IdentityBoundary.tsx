import { Fragment, type ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'

/** Reset local private page state when the signed-in identity changes. */
export function IdentityBoundary({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  return <Fragment key={user?.sub ?? ''}>{children}</Fragment>
}
