import { Link, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { FeaturePlaceholder } from "@/components/ui/FeaturePlaceholder";
import HomePage from "@/features/home/pages/HomePage";
import LoginPage from "@/features/auth/pages/LoginPage";
import RegisterPage from "@/features/auth/pages/RegisterPage";
import CatalogPage from "@/features/catalog/pages/CatalogPage";
import ProductPage from "@/features/catalog/pages/ProductPage";
import SearchPage from "@/features/search/pages/SearchPage";
import FavoritesPage from "@/features/favorites/pages/FavoritesPage";
import CartPage from "@/features/cart/pages/CartPage";
import CheckoutPage from "@/features/checkout/pages/CheckoutPage";
import OrdersPage from "@/features/orders/pages/OrdersPage";
import OrderPage from "@/features/orders/pages/OrderPage";
import ProfilePage from "@/features/profile/pages/ProfilePage";
import SettingsPage from "@/features/profile/pages/SettingsPage";
import ShopsPage from "@/features/shops/pages/ShopsPage";
import ShopPage from "@/features/shops/pages/ShopPage";
import MessagesPage from "@/features/messages/pages/MessagesPage";
import ChatPage from "@/features/messages/pages/ChatPage";
import NotificationsPage from "@/features/notifications/pages/NotificationsPage";
import SellerPage from "@/features/seller/pages/SellerPage";
import SellerProductsPage from "@/features/seller/pages/SellerProductsPage";
import SellerOrdersPage from "@/features/seller/pages/SellerOrdersPage";
import SellerShopPage from "@/features/seller/pages/SellerShopPage";

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/products/:productId" element={<ProductPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/:orderId" element={<OrderPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/shops" element={<ShopsPage />} />
        <Route path="/shops/:shopId" element={<ShopPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/messages/:threadId" element={<ChatPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/seller" element={<SellerPage />} />
        <Route path="/seller/products" element={<SellerProductsPage />} />
        <Route path="/seller/orders" element={<SellerOrdersPage />} />
        <Route path="/seller/shop" element={<SellerShopPage />} />
        <Route
          path="*"
          element={
            <FeaturePlaceholder title="Страница не найдена">
              <Link to="/">На главную</Link>
            </FeaturePlaceholder>
          }
        />
      </Route>
    </Routes>
  );
}
