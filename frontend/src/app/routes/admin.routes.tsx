import { lazy } from 'react'
import { Navigate, RouteObject } from 'react-router-dom'

import ProtectedRoute from '../../components/ProtectedRoute'
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
const Settings = lazy(() => import('../../pages/Settings'))
const SettingsOperations = lazy(() => import('../../pages/SettingsOperations'))
const SettingsAppearance = lazy(() => import('../../pages/SettingsAppearance'))
const SettingsSeo = lazy(() => import('../../pages/SettingsSeo'))
const Notifications = lazy(() => import('../../pages/Notifications'))
const EmailSettings = lazy(() => import('../../pages/EmailSettings'))
const ClientAnalytics = lazy(() => import('../../pages/ClientAnalytics'))
const StylistAnalytics = lazy(() => import('../../pages/StylistAnalytics'))
const Analytics = lazy(() => import('../../pages/Analytics'))
const Loyalty = lazy(() => import('../../pages/Loyalty'))
const ServiceWorkGallery = lazy(() => import('../../pages/ServiceWorkGallery'))
const AppReleases = lazy(() => import('../../pages/AppReleases'))

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
      { path: 'settings/operations', element: <SettingsOperations /> },
      { path: 'settings/appearance', element: <SettingsAppearance /> },
      { path: 'settings/seo', element: <SettingsSeo /> },
      { path: 'app-releases', element: <AppReleases /> },
      { path: 'notifications', element: <Notifications /> },
      { path: 'email-settings', element: <EmailSettings /> },
      { path: 'client-analytics', element: <ClientAnalytics /> },
      { path: 'stylist-analytics', element: <StylistAnalytics /> },
      { path: 'analytics', element: <Analytics /> },
      { path: 'loyalty', element: <Loyalty /> },
    ],
  },
]
