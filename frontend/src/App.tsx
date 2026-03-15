import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ChakraProvider } from '@chakra-ui/react';
import theme from './theme';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { SocketProvider } from './context/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import PublicLayout from './layouts/PublicLayout';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import PublicHome from './pages/public/PublicHome';
import PublicServices from './pages/public/PublicServices';
import PublicBlogList from './pages/public/PublicBlogList';
import PublicBlogPost from './pages/public/PublicBlogPost';
import PublicGallery from './pages/public/PublicGallery';
import PublicContact from './pages/public/PublicContact';
import PublicReserve from './pages/public/PublicReserve';
import PublicSatisfiedClients from './pages/public/PublicSatisfiedClients';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Salon from './pages/Salon';
import Services from './pages/Services';
import Stylists from './pages/Stylists';
import Reservations from './pages/Reservations';
import DailyLog from './pages/DailyLog';
import Finance from './pages/Finance';
import Blog from './pages/Blog';
import Gallery from './pages/Gallery';
import Reviews from './pages/Reviews';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
import ClientAnalytics from './pages/ClientAnalytics';
import StylistAnalytics from './pages/StylistAnalytics';
import Analytics from './pages/Analytics';
import Loyalty from './pages/Loyalty';
import NotFound from './pages/NotFound';
import './i18n';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<PublicLayout />}>
        <Route index element={<PublicHome />} />
        <Route path="usluge" element={<PublicServices />} />
        <Route path="blog" element={<PublicBlogList />} />
        <Route path="blog/:slug" element={<PublicBlogPost />} />
        <Route path="galerija" element={<PublicGallery />} />
        <Route path="kontakt" element={<PublicContact />} />
        <Route path="rezervacija" element={<PublicReserve />} />
        <Route path="zadovoljni-klijenti" element={<PublicSatisfiedClients />} />
      </Route>
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="users" element={<Users />} />
        <Route path="salon" element={<Salon />} />
        <Route path="services" element={<Services />} />
        <Route path="stylists" element={<Stylists />} />
        <Route path="reservations" element={<Reservations />} />
        <Route path="daily-log" element={<DailyLog />} />
        <Route path="finance" element={<Finance />} />
        <Route path="blog" element={<Blog />} />
        <Route path="gallery" element={<Gallery />} />
        <Route path="reviews" element={<Reviews />} />
        <Route path="settings" element={<Settings />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="client-analytics" element={<ClientAnalytics />} />
        <Route path="stylist-analytics" element={<StylistAnalytics />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="loyalty" element={<Loyalty />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ChakraProvider theme={theme}>
      <BrowserRouter>
        <AuthProvider>
          <SocketProvider>
            <SettingsProvider>
              <AppRoutes />
            </SettingsProvider>
          </SocketProvider>
        </AuthProvider>
      </BrowserRouter>
    </ChakraProvider>
  );
}
