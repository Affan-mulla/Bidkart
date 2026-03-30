import AppLayout from "@/layouts/AppLayout";
import AuthLayout from "@/layouts/AuthLayout";
import AuctionDetail from "@/pages/auction/AuctionDetail";
import AuctionList from "@/pages/auction/AuctionList";
import { isEmailVerificationEnabled } from "@/config/features";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import Home from "@/pages/public/Home";
import ProductDetail from "@/pages/public/ProductDetail";
import ProductList from "@/pages/public/ProductList";
import SearchResultsPage from "@/pages/public/SearchResultsPage";

import { Navigate, Route, Routes } from "react-router-dom";
import GuestCartRoute from "./GuestCartRoute";
import Cart from "@/pages/buyer/Cart";
import RequireBuyerAuth from "./RequireBuyerAuth";
import Checkout from "@/pages/buyer/Checkout";
import Orders from "@/pages/buyer/Orders";
import OrderDetail from "@/pages/buyer/OrderDetail";
import Wishlist from "@/pages/buyer/Wishlist";
import Profile from "@/pages/buyer/Profile";
import SellerProtectedRoute from "./SellerProtectedRoute";
import SellerDashboard from "@/pages/seller/SellerDashboard";
import SellerListings from "@/pages/seller/SellerListings";
import SellerOrders from "@/pages/seller/SellerOrders";
import CreateAuction from "@/pages/seller/CreateAuction";
import SellerAnalytics from "@/pages/seller/SellerAnalytics";
import Unauthorized from "@/pages/public/Unauthorized";
import VerifyEmailPage from "@/pages/auth/VerifyEmailPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";
import SellerRegisterPage from "@/pages/auth/SellerRegisterPage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="/register/seller" element={<SellerRegisterPage />} />
      <Route element={<AuthLayout />}>
        <Route
          path="/verify-email"
          element={
            isEmailVerificationEnabled ? <VerifyEmailPage /> : <Navigate to="/login" replace />
          }
        />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      {/* RoleLayout wraps ALL routes — navbar is always present */}
      <Route element={<AppLayout />}>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<ProductList />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/s" element={<SearchResultsPage />} />
        <Route path="/auctions" element={<AuctionList />} />
        <Route path="/auctions/:id" element={<AuctionDetail />} />

        {/* Cart — guest allowed */}
        <Route element={<GuestCartRoute />}>
          <Route path="/cart" element={<Cart />} />
        </Route>

        {/* Buyer — auth required */}
        <Route element={<RequireBuyerAuth />}>
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        {/* Seller — fully protected */}
        <Route element={<SellerProtectedRoute />}>
          <Route path="/seller/dashboard" element={<SellerDashboard />} />
          <Route path="/seller/listings" element={<SellerListings />} />
          <Route path="/seller/orders" element={<SellerOrders />} />
          <Route path="/seller/auctions/create" element={<CreateAuction />} />
          <Route path="/seller/analytics" element={<SellerAnalytics />} />
        </Route>
      </Route>
    </Routes>
  );
}
