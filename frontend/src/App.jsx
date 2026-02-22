import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import AuthSuccess from "./pages/AuthSuccess";
import InboxPage from "./pages/InboxPage";

function PrivateRoute({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/auth/success" element={<AuthSuccess />} />
        <Route path="/inbox" element={<PrivateRoute><InboxPage /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
