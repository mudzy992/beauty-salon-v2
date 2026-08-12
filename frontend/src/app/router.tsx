import { Navigate, useRoutes } from 'react-router-dom'

import PublicOnlyRoute from '../components/PublicOnlyRoute'
import ProtectedRoute from '../components/ProtectedRoute'
import Login from '../pages/Login'
import Register from '../pages/Register'
import ForceChangePassword from '../pages/ForceChangePassword'
import OnboardingGender from '../pages/onboarding/OnboardingGender'
import OnboardingEmail from '../pages/onboarding/OnboardingEmail'
import ReservationsCalendar from '../pages/ReservationsCalendar'
import NotFound from '../pages/NotFound'
import { adminRoutes } from './routes/admin.routes'
import { publicRoutes } from './routes/public.routes'
import StylistRoute from '../components/StylistRoute'
import StylistLayout from '../layouts/StylistLayout'
import { WorkbookListPage } from '../features/stylist-workbook/pages/workbook-list-page'
import { WorkbookNewEntryPage } from '../features/stylist-workbook/pages/workbook-new-entry-page'
import { WorkbookDetailPage } from '../features/stylist-workbook/pages/workbook-detail-page'
import { WorkbookReschedulePreviewPage } from '../features/stylist-workbook/pages/workbook-reschedule-preview-page'
import { StylistInboxPage } from '../features/stylist-portal/pages/stylist-inbox-page'
import { StylistSchedulePage } from '../features/stylist-portal/pages/stylist-schedule-page'
import { StylistDirectBookingPage } from '../features/stylist-portal/pages/stylist-direct-booking-page'
import { StylistReservationDetailPage } from '../features/stylist-portal/pages/stylist-reservation-detail-page'
import { StylistStatsPage } from '../features/stylist-portal/pages/stylist-stats-page'
import { StylistDebtsPage } from '../features/stylist-portal/pages/stylist-debts-page'

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

  return element
}

