import { Navigate, RouteObject } from 'react-router-dom'

import ProtectedRoute from '../../components/ProtectedRoute'
import DashboardLayout from '../../layouts/DashboardLayout'
import Dashboard from '../../pages/Dashboard'
import Users from '../../pages/Users'
import Salon from '../../pages/Salon'
import Services from '../../pages/Services'
import Stylists from '../../pages/Stylists'
import Reservations from '../../pages/Reservations'
import DailyLog from '../../pages/DailyLog'
import Finance from '../../pages/Finance'
import Blog from '../../pages/Blog'
import Gallery from '../../pages/Gallery'
import Reviews from '../../pages/Reviews'
import Settings from '../../pages/Settings'
import Notifications from '../../pages/Notifications'
import EmailSettings from '../../pages/EmailSettings'
import ClientAnalytics from '../../pages/ClientAnalytics'
import StylistAnalytics from '../../pages/StylistAnalytics'
import Analytics from '../../pages/Analytics'
import Loyalty from '../../pages/Loyalty'
import ServiceWorkGallery from '../../pages/ServiceWorkGallery'

export const adminRoutes: RouteObject[] = [
  {
    path: '/admin',
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'users', element: <Users /> },
      { path: 'salon', element: <Salon /> },
      { path: 'services', element: <Services /> },
      { path: 'services/:serviceId/work-gallery', element: <ServiceWorkGallery /> },
      { path: 'stylists', element: <Stylists /> },
      { path: 'reservations', element: <Reservations /> },
      { path: 'daily-log', element: <DailyLog /> },
      { path: 'finance', element: <Finance /> },
      { path: 'debtors', element: <Navigate to="/admin/finance?tab=debtors" replace /> },
      { path: 'blog', element: <Blog /> },
      { path: 'gallery', element: <Gallery /> },
      { path: 'reviews', element: <Reviews /> },
      { path: 'settings', element: <Settings /> },
      { path: 'notifications', element: <Notifications /> },
      { path: 'email-settings', element: <EmailSettings /> },
      { path: 'client-analytics', element: <ClientAnalytics /> },
      { path: 'stylist-analytics', element: <StylistAnalytics /> },
      { path: 'analytics', element: <Analytics /> },
      { path: 'loyalty', element: <Loyalty /> },
    ],
  },
]

