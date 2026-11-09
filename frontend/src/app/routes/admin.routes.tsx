import { lazy } from 'react'
import { Navigate, RouteObject } from 'react-router-dom'

import ProtectedRoute from '../../components/ProtectedRoute'
import { TabRedirect } from '../../features/shell/admin/tab-redirect'
import DashboardLayout from '../../layouts/DashboardLayout'

const Dashboard = lazy(() => import('../../pages/Dashboard'))
const Users = lazy(() => import('../../pages/Users'))
const Salon = lazy(() => import('../../pages/Salon'))
const Services = lazy(() => import('../../pages/Services'))
const Stylists = lazy(() => import('../../pages/Stylists'))
const Reservations = lazy(() => import('../../pages/Reservations'))
const DailyLog = lazy(() => import('../../pages/DailyLog'))
const Finance = lazy(() => import('../../pages/Finance'))
const Blog = lazy(() => import('../../pages/Blog'))
const Gallery = lazy(() => import('../../pages/Gallery'))
const Reviews = lazy(() => import('../../pages/Reviews'))
const SettingsHub = lazy(() => import('../../pages/SettingsHub'))
// M1 / Q7: tri analitike su tabovi jednog hub-a; kod-splitting je unutar AnalyticsHub-a.
const AnalyticsHub = lazy(() => import('../../pages/AnalyticsHub'))
const Loyalty = lazy(() => import('../../pages/Loyalty'))
const ServiceWorkGallery = lazy(() => import('../../pages/ServiceWorkGallery'))

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
      { path: 'settings', element: <SettingsHub /> },
      { path: 'settings/operations', element: <TabRedirect to="/admin/settings" tab="operations" /> },
      { path: 'settings/appearance', element: <TabRedirect to="/admin/settings" tab="appearance" /> },
      { path: 'settings/seo', element: <TabRedirect to="/admin/settings" tab="seo" /> },
      { path: 'app-releases', element: <TabRedirect to="/admin/settings" tab="releases" /> },
      { path: 'notifications', element: <TabRedirect to="/admin/settings" tab="notifications" /> },
      { path: 'email-settings', element: <TabRedirect to="/admin/settings" tab="email" /> },
      { path: 'analytics', element: <AnalyticsHub /> },
      { path: 'client-analytics', element: <TabRedirect to="/admin/analytics" tab="clients" /> },
      { path: 'stylist-analytics', element: <TabRedirect to="/admin/analytics" tab="stylists" /> },
      { path: 'loyalty', element: <Loyalty /> },
    ],
  },
]
