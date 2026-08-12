import { RouteObject } from 'react-router-dom'

import PublicLayout from '../../layouts/PublicLayout'
import Profile from '../../pages/Profile'
import PublicHome from '../../pages/public/PublicHome'
import PublicServices from '../../pages/public/PublicServices'
import PublicServiceDetail from '../../pages/public/PublicServiceDetail'
import PublicBlogList from '../../pages/public/PublicBlogList'
import PublicBlogPost from '../../pages/public/PublicBlogPost'
import PublicGallery from '../../pages/public/PublicGallery'
import PublicContact from '../../pages/public/PublicContact'
import PublicReserve from '../../pages/public/PublicReserve'
import PublicReservationView from '../../pages/public/PublicReservationView'
import MyReservations from '../../pages/public/MyReservations'
import PublicSatisfiedClients from '../../pages/public/PublicSatisfiedClients'

export const publicRoutes: RouteObject[] = [
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: <PublicHome /> },
      { path: 'usluge', element: <PublicServices /> },
      { path: 'usluge/:serviceId', element: <PublicServiceDetail /> },
      { path: 'blog', element: <PublicBlogList /> },
      { path: 'blog/:slug', element: <PublicBlogPost /> },
      { path: 'galerija', element: <PublicGallery /> },
      { path: 'kontakt', element: <PublicContact /> },
      { path: 'rezervacija', element: <PublicReserve /> },
      { path: 'moje-rezervacije', element: <MyReservations /> },
      { path: 'moj-termin/:token', element: <PublicReservationView /> },
      { path: 'profil', element: <Profile /> },
      { path: 'zadovoljni-klijenti', element: <PublicSatisfiedClients /> },
    ],
  },
]

