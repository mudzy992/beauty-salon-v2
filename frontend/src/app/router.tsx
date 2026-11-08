import { lazy, Suspense } from 'react'
import { Navigate, useRoutes } from 'react-router-dom'

import PublicOnlyRoute from '../components/PublicOnlyRoute'
import ProtectedRoute from '../components/ProtectedRoute'
import { RouteLoadingFallback } from './route-loading-fallback'
import { adminRoutes } from './routes/admin.routes'
import { publicRoutes } from './routes/public.routes'
import StylistRoute from '../components/StylistRoute'
import StylistLayout from '../layouts/StylistLayout'

const Login = lazy(() => import('../pages/Login'))
const Register = lazy(() => import('../pages/Register'))
const ResetPassword = lazy(() => import('../pages/ResetPassword'))
const ForceChangePassword = lazy(() => import('../pages/ForceChangePassword'))
const OnboardingGender = lazy(() => import('../pages/onboarding/OnboardingGender'))
const OnboardingEmail = lazy(() => import('../pages/onboarding/OnboardingEmail'))
const ReservationsCalendar = lazy(() => import('../pages/ReservationsCalendar'))
const NotFound = lazy(() => import('../pages/NotFound'))

const WorkbookListPage = lazy(() =>
  import('../features/stylist-workbook/pages/workbook-list-page').then((module) => ({
    default: module.WorkbookListPage,
  })),
)
const WorkbookNewEntryPage = lazy(() =>
  import('../features/stylist-workbook/pages/workbook-new-entry-page').then((module) => ({
    default: module.WorkbookNewEntryPage,
  })),
)
const WorkbookDetailPage = lazy(() =>
  import('../features/stylist-workbook/pages/workbook-detail-page').then((module) => ({
    default: module.WorkbookDetailPage,
  })),
)
const WorkbookReschedulePreviewPage = lazy(() =>
  import('../features/stylist-workbook/pages/workbook-reschedule-preview-page').then((module) => ({
    default: module.WorkbookReschedulePreviewPage,
  })),
)
const StylistInboxPage = lazy(() =>
  import('../features/stylist-portal/pages/stylist-inbox-page').then((module) => ({
    default: module.StylistInboxPage,
  })),
)
const StylistSchedulePage = lazy(() =>
  import('../features/stylist-portal/pages/stylist-schedule-page').then((module) => ({
    default: module.StylistSchedulePage,
  })),
)
const StylistDirectBookingPage = lazy(() =>
  import('../features/stylist-portal/pages/stylist-direct-booking-page').then((module) => ({
    default: module.StylistDirectBookingPage,
  })),
)
const StylistReservationDetailPage = lazy(() =>
  import('../features/stylist-portal/pages/stylist-reservation-detail-page').then((module) => ({
    default: module.StylistReservationDetailPage,
  })),
)
const StylistStatsPage = lazy(() =>
  import('../features/stylist-portal/pages/stylist-stats-page').then((module) => ({
    default: module.StylistStatsPage,
  })),
)
const StylistDebtsPage = lazy(() =>
  import('../features/stylist-portal/pages/stylist-debts-page').then((module) => ({
    default: module.StylistDebtsPage,
  })),
)

export const AppRouter = () => {
  const element = useRoutes([
    {
      path: '/stylist',
      element: (
        <StylistRoute>
          <StylistLayout />
        </StylistRoute>
      ),
      children: [
        {
          index: true,
          element: <Navigate to="/stylist/inbox" replace />,
        },
        {
          path: 'inbox',
          element: <StylistInboxPage />,
        },
        {
          path: 'workbook',
          element: <WorkbookListPage />,
        },
        {
          path: 'workbook/new',
          element: <WorkbookNewEntryPage />,
        },
        {
          path: 'workbook/reschedule-preview/:reservationId',
          element: <WorkbookReschedulePreviewPage />,
        },
        {
          path: 'workbook/:entryId',
          element: <WorkbookDetailPage />,
        },
        {
          path: 'schedule',
          element: <StylistSchedulePage />,
        },
        {
          path: 'schedule/new',
          element: <StylistDirectBookingPage />,
        },
        {
          path: 'schedule/:reservationId',
          element: <StylistReservationDetailPage />,
        },
        {
          path: 'debts',
          element: <StylistDebtsPage />,
        },
        {
          path: 'stats',
          element: <StylistStatsPage />,
        },
        {
          path: 'profile',
          element: <Navigate to="/profil" replace />,
        },
      ],
    },
    {
      path: '/admin/reservations/calendar',
      element: (
        <ProtectedRoute>
          <ReservationsCalendar />
        </ProtectedRoute>
      ),
    },
    {
      path: '/login',
      element: (
        <PublicOnlyRoute>
          <Login />
        </PublicOnlyRoute>
      ),
    },
    {
      path: '/register',
      element: (
        <PublicOnlyRoute>
          <Register />
        </PublicOnlyRoute>
      ),
    },
    {
      path: '/reset-password',
      element: <ResetPassword />,
    },
    {
      path: '/force-change-password',
      element: (
        <ProtectedRoute>
          <ForceChangePassword />
        </ProtectedRoute>
      ),
    },
    {
      path: '/onboarding/gender',
      element: (
        <ProtectedRoute>
          <OnboardingGender />
        </ProtectedRoute>
      ),
    },
    {
      path: '/onboarding/email',
      element: (
        <ProtectedRoute>
          <OnboardingEmail />
        </ProtectedRoute>
      ),
    },
    ...publicRoutes,
    ...adminRoutes,
    { path: '*', element: <NotFound /> },
  ])

  return <Suspense fallback={<RouteLoadingFallback />}>{element}</Suspense>
}
