import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import RequireRole from './RequireRole';
import AppShell from '@/components/layout/AppShell';
import RouteFallback from './RouteFallback';

// Public home is eager — first paint for every visitor.
import Landing from '@/pages/public/Landing';

// ---------- Public marketing ----------
const Features = lazy(() => import('@/pages/public/Features'));
const Pricing = lazy(() => import('@/pages/public/Pricing'));
const About = lazy(() => import('@/pages/public/About'));
const Contact = lazy(() => import('@/pages/public/Contact'));

// ---------- Auth ----------
const Login = lazy(() => import('@/pages/auth/Login'));
const Signup = lazy(() => import('@/pages/auth/Signup'));
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/auth/ResetPassword'));

// ---------- Post-auth (no shell) ----------
const Loading = lazy(() => import('@/pages/loading/Loading'));
const Onboarding = lazy(() => import('@/pages/onboarding/Onboarding'));
const NotAuthorized = lazy(() => import('@/pages/errors/NotAuthorized'));

// ---------- Core app ----------
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

// ---------- Settings ----------
const SettingsLayout = lazy(() => import('@/pages/settings/SettingsLayout'));
const BusinessSettings = lazy(() => import('@/pages/settings/BusinessSettings'));
const TeamSettings = lazy(() => import('@/pages/settings/TeamSettings'));
const ActivityLog = lazy(() => import('@/pages/settings/ActivityLog'));
const AccountSettings = lazy(() => import('@/pages/settings/AccountSettings'));
const SecuritySettings = lazy(() => import('@/pages/settings/SecuritySettings'));
const ReceiptSettings = lazy(() => import('@/pages/settings/ReceiptSettings'));

// ---------- Account ----------
const Profile = lazy(() => import('@/pages/profile/Profile'));
const Notifications = lazy(() => import('@/pages/notifications/Notifications'));
const Help = lazy(() => import('@/pages/help/Help'));

export default function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* ============================================================
            Public marketing
            ============================================================ */}
        <Route path="/" element={<Landing />} />
        <Route path="/features" element={<Features />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />

        {/* ============================================================
            Auth
            ============================================================ */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-otp" element={<Navigate to="/login" replace />} />

        {/* ============================================================
            Post-auth pages without the app shell
            ============================================================ */}
        <Route element={<ProtectedRoute />}>
          <Route path="/loading" element={<Loading />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/unauthorized" element={<NotAuthorized />} />
        </Route>

        {/* ============================================================
            App shell — every route inside requires a permission
            ============================================================ */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            {/* ---------- POS (everyone) ---------- */}
            <Route element={<RequireRole action="pos.use" />}>
              <Route path="/pos" element={<POS />} />
            </Route>

            {/* ---------- Dashboard ---------- */}
            <Route element={<RequireRole action="dashboard.view" />}>
              <Route path="/dashboard" element={<Dashboard />} />
            </Route>

            {/* ---------- Sales ---------- */}
            <Route element={<RequireRole action="sales.view" />}>
              <Route path="/sales" element={<Sales />} />
            </Route>

            {/* ---------- Shifts ---------- */}
            <Route element={<RequireRole action="shifts.view" />}>
              <Route path="/shifts" element={<Shifts />} />
            </Route>

            {/* ---------- Catalogue ---------- */}
            <Route element={<RequireRole action="products.view" />}>
              <Route path="/products" element={<Products />} />
            </Route>

            <Route element={<RequireRole action="categories.view" />}>
              <Route path="/categories" element={<Categories />} />
            </Route>

            <Route element={<RequireRole action="inventory.view" />}>
              <Route path="/inventory" element={<Inventory />} />
            </Route>

            {/* ---------- Customers ---------- */}
            <Route element={<RequireRole action="customers.view" />}>
              <Route path="/customers" element={<Customers />} />
              <Route path="/customers/:id" element={<CustomerProfile />} />
            </Route>

            {/* ---------- Suppliers ---------- */}
            <Route element={<RequireRole action="suppliers.view" />}>
              <Route path="/suppliers" element={<Suppliers />} />
              <Route path="/suppliers/:id" element={<SupplierDetail />} />
            </Route>

            {/* ---------- Purchases ---------- */}
            <Route element={<RequireRole action="purchases.view" />}>
              <Route path="/purchases" element={<Purchases />} />
              <Route path="/purchases/new" element={<NewPurchase />} />
              <Route path="/purchases/:id" element={<PurchaseDetail />} />
            </Route>

            {/* ---------- Reports & Analytics ---------- */}
            <Route element={<RequireRole action="reports.view" />}>
              <Route path="/reports" element={<Reports />} />
            </Route>

            <Route element={<RequireRole action="analytics.view" />}>
              <Route path="/analytics" element={<Analytics />} />
            </Route>

            {/* ---------- Subscription — split view vs manage ---------- */}
            <Route element={<RequireRole action="subscription.view" />}>
              <Route path="/subscription" element={<Subscription />} />
            </Route>

            <Route element={<RequireRole action="subscription.manage" />}>
              <Route path="/subscription/checkout" element={<Checkout />} />
            </Route>

            {/* ---------- Settings ---------- */}
            <Route path="/settings" element={<SettingsLayout />}>
              {/* Default settings page depends on role — the layout
                  handles the redirect via its index. Fallback to account. */}
              <Route index element={<Navigate to="/settings/account" replace />} />

              {/* Business + Receipt — owner + manager */}
              <Route element={<RequireRole action="settings.update" />}>
                <Route path="business" element={<BusinessSettings />} />
                <Route path="receipt" element={<ReceiptSettings />} />
              </Route>

              {/* Team + Activity — owner only */}
              <Route element={<RequireRole action="team.manage" />}>
                <Route path="team" element={<TeamSettings />} />
                <Route path="activity" element={<ActivityLog />} />
              </Route>

              {/* Account + Security — everyone */}
              <Route path="account" element={<AccountSettings />} />
              <Route path="security" element={<SecuritySettings />} />
            </Route>

            {/* ---------- Account pages ---------- */}
            <Route path="/profile" element={<Profile />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/help" element={<Help />} />
          </Route>
        </Route>

        {/* ============================================================
            Fallback
            ============================================================ */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}