import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation, Link } from "react-router-dom";
import { HelmetProvider, Helmet } from "react-helmet-async"; // ✅ SEO
import { motion, AnimatePresence } from "framer-motion";

// Components & Pages
import LoginPage from "./pages/LoginPage";
import DeptDashboard from "./components/DeptDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import AquaGlassLayout from "./layouts/AquaGlassLayout";
import AdminDashboard from "./components/AdminDashboard";
import ForgotPassword from "./pages/ForgotPassword";
import VerifyOtp from "./pages/VerifyOtp";
import ResetPassword from "./pages/ResetPassword";

// Tools
import { ThemeProvider } from "./contexts/ThemeContext";
import GlobalStyles from "./styles/GlobalStyles";
import AuthService from "./utils/AuthService";

// ✅ 1. Advanced Video Loading Screen
const LoadingScreen = () => (
  <motion.div
    initial={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.8 }}
    className="fixed inset-0 z-[999] flex items-center justify-center bg-white overflow-hidden"
  >
    {/* Replace URL with your actual video path */}
    <video 
      autoPlay 
      muted 
      loop 
      playsInline
      className="absolute min-w-full min-h-full object-cover opacity-30"
    >
      <source src="https://assets.mixkit.co/videos/preview/mixkit-abstract-blue-and-white-flowing-lines-34747-large.mp4" type="video/mp4" />
    </video>
    
    <div className="relative z-10 flex flex-col items-center">
      <motion.div
        animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
        transition={{ repeat: Infinity, duration: 3 }}
      >
        <img src="https://res.cloudinary.com/duhki4wze/image/upload/v1756755114/nhce_25-scaled-2_a6givc.png" alt="Logo" className="w-24 mb-6" />
      </motion.div>
      <div className="w-48 h-1 bg-gray-200 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ duration: 2 }}
          className="h-full bg-blue-500"
        />
      </div>
      <p className="mt-4 text-slate-600 font-medium animate-pulse">Initializing Secure Session...</p>
    </div>
  </motion.div>
);

// ✅ 2. Custom 404 "Broken URL" Page
const NotFound = () => (
  <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
    <h1 className="text-9xl font-bold text-blue-600/20 absolute">404</h1>
    <div className="relative z-10">
      <h2 className="text-3xl font-bold text-slate-800 mb-2">Oops! You are lost, bro.</h2>
      <p className="text-slate-500 mb-8 max-w-md">The page you entered does not exist or has been moved. Please head back to safety.</p>
      <Link 
        to="/" 
        className="px-8 py-3 bg-blue-600 text-white rounded-full font-bold shadow-lg hover:bg-blue-700 transition-all hover:scale-105"
      >
        Go to Login Page
      </Link>
    </div>
  </div>
);

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === "/" || location.pathname.startsWith("/login")) {
      AuthService.logout();
    }
  }, [location.pathname]);

  useEffect(() => {
    let isMounted = true;
    const restore = AuthService.autoLogin();
    if (restore?.user && isMounted) {
      setUser(restore.user);
    }
    // Artificial delay to show the nice video loader
    setTimeout(() => isMounted && setChecking(false), 2500); 
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener("logout", onLogout);
    return () => window.removeEventListener("logout", onLogout);
  }, []);

  return (
    <HelmetProvider>
      <ThemeProvider>
        {/* ✅ SEO Management */}
        <Helmet>
          <title>Seminar Hall Booking | NHCE</title>
          <meta name="description" content="Official portal for booking seminar halls at New Horizon College of Engineering." />
        </Helmet>

        <GlobalStyles />

        <AnimatePresence mode="wait">
          {checking ? (
            <LoadingScreen key="loader" />
          ) : (
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Routes location={location} key={location.pathname}>
                <Route path="/" element={<LoginPage setUser={setUser} />} />
                <Route path="/forgot" element={<ForgotPassword />} />
                <Route path="/verify" element={<VerifyOtp />} />
                <Route path="/reset" element={<ResetPassword />} />

                <Route path="/admin/*" element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <AquaGlassLayout user={user} setUser={setUser}>
                      <AdminDashboard user={user} setUser={setUser} />
                    </AquaGlassLayout>
                  </ProtectedRoute>
                } />

                <Route path="/dept/*" element={
                  <ProtectedRoute requiredRole="DEPARTMENT">
                    <AquaGlassLayout user={user} setUser={setUser}>
                      <DeptDashboard user={user} setUser={setUser} />
                    </AquaGlassLayout>
                  </ProtectedRoute>
                } />

                {/* ✅ Broken URL Handler */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </motion.div>
          )}
        </AnimatePresence>
      </ThemeProvider>
    </HelmetProvider>
  );
}