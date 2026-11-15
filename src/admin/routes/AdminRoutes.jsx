import { Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "../layout/AdminLayout";
import Dashboard from "../pages/Dashboard/Dashboard";
import Customers from "../pages/Customers/Customers";
import Sellers from "../pages/Sellers/Sellers";
import AccountDetails from "../pages/Accounts/AccountDetails";
import Shops from "../pages/Shops/Shops";
import ShopDetails from "../pages/Shops/ShopDetails";
import Applications from "../pages/Applications/Applications";
import Products from "../pages/Products/Products";
import Orders from "../pages/Orders/Orders";
import Subscriptions from "../pages/Subscriptions/Subscriptions";
import Notifications from "../pages/Notifications/Notifications";
import Settings from "../pages/Settings/Settings";
import RecordDetails from "../pages/Records/RecordDetails";
import History from "../pages/History/History";
export default function AdminRoutes() {
  return (
    <Routes>
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="customers" element={<Customers />} />
        <Route
          path="customers/:id"
          element={<AccountDetails key="customer" kind="customers" />}
        />
        <Route path="sellers" element={<Sellers />} />
        <Route
          path="sellers/:id"
          element={<AccountDetails key="seller" kind="sellers" />}
        />
        <Route path="shops" element={<Shops />} />
        <Route path="shops/:id" element={<ShopDetails />} />
        <Route path="applications" element={<Applications />} />
        <Route path="products" element={<Products />} />
        <Route
          path="products/:id"
          element={<RecordDetails key="product" kind="products" />}
        />
        <Route path="orders" element={<Orders />} />
        <Route
          path="orders/:id"
          element={<RecordDetails key="order" kind="orders" />}
        />
        <Route path="subscriptions" element={<Subscriptions />} />
        <Route
          path="subscriptions/:id"
          element={<RecordDetails key="subscription" kind="subscriptions" />}
        />
        <Route path="history" element={<History />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  );
}
