import { lazy } from 'react'
import { RouteObject } from 'react-router-dom'

import PublicLayout from '../../layouts/PublicLayout'
import { PublicFeatureGate } from '../../features/shell/public/public-feature-gate'

const Profile = lazy(() => import('../../pages/Profile'))
const PublicHome = lazy(() => import('../../pages/public/PublicHome'))
const PublicServices = lazy(() => import('../../pages/public/PublicServices'))
const PublicServiceDetail = lazy(() => import('../../pages/public/PublicServiceDetail'))
const PublicBlogList = lazy(() => import('../../pages/public/PublicBlogList'))
const PublicBlogPost = lazy(() => import('../../pages/public/PublicBlogPost'))
const PublicGallery = lazy(() => import('../../pages/public/PublicGallery'))
const PublicContact = lazy(() => import('../../pages/public/PublicContact'))
const PublicReserve = lazy(() => import('../../pages/public/PublicReserve'))
const PublicReservationView = lazy(() => import('../../pages/public/PublicReservationView'))
const MyReservations = lazy(() => import('../../pages/public/MyReservations'))
const MyReservationDetail = lazy(() => import('../../pages/public/MyReservationDetail'))
const PublicSatisfiedClients = lazy(() => import('../../pages/public/PublicSatisfiedClients'))
const CampaignUnsubscribe = lazy(() => import('../../pages/public/CampaignUnsubscribe'))

export const publicRoutes: RouteObject[] = [
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: <PublicHome /> },
      { path: 'usluge', element: <PublicServices /> },
      { path: 'usluge/:serviceId', element: <PublicServiceDetail /> },
      { path: 'blog', element: <PublicFeatureGate flag="public_feature_blog"><PublicBlogList /></PublicFeatureGate> },
      { path: 'blog/:slug', element: <PublicFeatureGate flag="public_feature_blog"><PublicBlogPost /></PublicFeatureGate> },
      { path: 'galerija', element: <PublicFeatureGate flag="public_feature_gallery"><PublicGallery /></PublicFeatureGate> },
      { path: 'kontakt', element: <PublicContact /> },
      { path: 'rezervacija', element: <PublicReserve /> },
      { path: 'moje-rezervacije', element: <MyReservations /> },
      { path: 'moje-rezervacije/:id', element: <MyReservationDetail /> },
      { path: 'moj-termin/:token', element: <PublicReservationView /> },
      { path: 'unsubscribe', element: <CampaignUnsubscribe /> },
      { path: 'profil', element: <Profile /> },
      { path: 'zadovoljni-klijenti', element: <PublicFeatureGate flag="public_feature_reviews"><PublicSatisfiedClients /></PublicFeatureGate> },
    ],
  },
]
