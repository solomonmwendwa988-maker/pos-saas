import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import AppShell from '@/components/layout/AppShell';
import RouteFallback from './RouteFallback';

// Public home is eager — first paint for every visitor.
import Landing from '@/pages/public/Landing';

// Everything else is lazy-loaded.
const Features = lazy(() => import('@/pages/public/Features'));
const Pricing = lazy(() => import('@/pages/public/Pricing'));
const About = lazy(() => import('@/pages/public/About'));
const Contact = lazy(() => import('@/pages/public/Contact'));

const Login = lazy(() => import('@/pages/auth/Login'));
const Signup = lazy(() => import('@/pages/auth/Signup'));
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/auth/ResetPassword'));

const Loading = lazy(() => import('@/pages/loading/Loading'));
const Onboarding = lazy(() => import('@/pages/onboarding/Onboarding'));

const Dashboard = lazy(() => import('@/pages/dashboard/Dashboard'));
const POS = lazy(() => import('@/pages/pos/POS'));
const Products = lazy(() => import('@/pages/products/Products'));
const Categories = lazy(() => import('@/pages/categories/Categories'));
const Inventory = lazy(() => import('@/pages/inventory/Inventory'));
const Sales = lazy(() => import('@/pages/sales/Sales'));
const Shifts = lazy(() => import('@/pages/shifts/Shifts'));
const Customers = lazy(() => import('@/pages/customers/Customers'));
const CustomerProfile = lazy(() => import('@/pages/customers/CustomerProfile'));
const Suppliers = lazy(() => import('@/pages/suppliers/Suppliers'));
const SupplierDetail = lazy(() => import('@/pages/suppliers/SupplierDetail'));
const Purchases = lazy(() => import('@/pages/purchases/Purchases'));
const NewPurchase = lazy(() => import('@/pages/purchases/NewPurchase'));
const PurchaseDetail = lazy(() => import('@/pages/purchases/PurchaseDetail'));
const Reports = lazy(() => import('@/pages/reports/Reports'));
const Analytics = lazy(() => import('@/pages/analytics/Analytics'));
const Subscription = lazy(() => import('@/pages/subscription/Subscription'));
const Checkout = lazy(() => import('@/pages/subscription/Checkout'));

const SettingsLayout = lazy(() => import('@/pages/settings/SettingsLayout'));
const BusinessSettings = lazy(() => import('@/pages/settings/BusinessSettings'));
const AccountSettings = lazy(() => import('@/pages/settings/AccountSettings'));
const SecuritySettings = lazy(() => import('@/pages/settings/SecuritySettings'));
const ReceiptSettings = lazy(() => import('@/pages/settings/ReceiptSettings'));

const Profile = lazy(() => import('@/pages/profile/Profile'));
const Notifications = lazy(() => import('@/pages/notifications/Notifications'));
const Help = lazy(() => import('@/pages/help/Help'));

export default function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* ---------- Public marketing ---------- */}
        <Route path="/" element={<Landing />} />
        <Route path="/features" element={<Features />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />

        {/* ---------- Auth ---------- */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-otp" element={<Navigate to="/login" replace />} />

        {/* ---------- Authenticated ---------- */}
        <Route element={<ProtectedRoute />}>
          {/* Full-screen loading after login/signup */}
          <Route path="/loading" element={<Loading />} />

          {/* Onboarding lives outside the app shell */}
          <Route path="/onboarding" element={<Onboarding />} />

          <Route element={<AppShell />}>
            {/* Core */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/pos" element={<POS />} />

            {/* Catalogue */}
            <Route path="/products" element={<Products />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/inventory" element={<Inventory />} />

            {/* Transactions */}
            <Route path="/sales" element={<Sales />} />
            <Route path="/shifts" element={<Shifts />} />

            {/* Relationships */}
            <Route path="/customers" element={<Customers />} />
            <Route path="/customers/:id" element={<CustomerProfile />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/suppliers/:id" element={<SupplierDetail />} />

            {/* Purchases — order matters: /new before /:id */}
            <Route path="/purchases" element={<Purchases />} />
            <Route path="/purchases/new" element={<NewPurchase />} />
            <Route path="/purchases/:id" element={<PurchaseDetail />} />

            {/* Insight */}
            <Route path="/reports" element={<Reports />} />
            <Route path="/analytics" element={<Analytics />} />

            {/* Billing */}
            <Route path="/subscription" element={<Subscription />} />
            <Route path="/subscription/checkout" element={<Checkout />} />

            {/* Settings (nested) */}
            <Route path="/settings" element={<SettingsLayout />}>
              <Route index element={<Navigate to="/settings/business" replace />} />
              <Route path="business" element={<BusinessSettings />} />
              <Route path="account" element={<AccountSettings />} />
              <Route path="security" element={<SecuritySettings />} />
              <Route path="receipt" element={<ReceiptSettings />} />
            </Route>

            {/* Account */}
            <Route path="/profile" element={<Profile />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/help" element={<Help />} />
          </Route>
        </Route>

        {/* ---------- Fallback ---------- */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}