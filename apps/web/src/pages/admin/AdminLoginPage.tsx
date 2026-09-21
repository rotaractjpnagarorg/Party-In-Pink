import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Shield, AlertCircle } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext.js';
import { BrandLogo } from '../../components/common/BrandLogo.js';

export const AdminLoginPage: React.FC = () => {
  const { loginWithGoogle, isAuthenticated, loading, error } = useAdminAuth();
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/admin', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin w-8 h-8 border-4 border-pip-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  const handleGoogleLogin = async () => {
    setSubmitting(true);
    try {
      await loginWithGoogle();
    } catch {
      // Error state handled via AdminAuthContext
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-pip-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <BrandLogo tone="dark-surface" className="mx-auto mb-4" />
          <p className="text-slate-400 text-sm font-medium tracking-wide">
            Party In Pink 5.0 • Operations Portal
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 p-8 shadow-2xl">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-pip-500/10 border border-pip-500/20 text-pip-400 mb-3">
              <Shield className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Admin Console Sign In</h2>
            <p className="text-slate-400 text-xs mt-1">
              Restricted to authorized Rotaract committee members
            </p>
          </div>

          {error && (
            <div className="flex items-start space-x-2.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 mb-5">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <p className="text-sm text-red-300 leading-snug">{error}</p>
            </div>
          )}

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={submitting}
            className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-semibold text-sm shadow-lg shadow-black/20 flex items-center justify-center gap-3 transition-all duration-150 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
          >
            {submitting ? (
              <span className="flex items-center justify-center space-x-2">
                <span className="animate-spin w-4 h-4 border-2 border-slate-700 border-t-transparent rounded-full" />
                <span className="text-slate-700 font-medium">Signing in with Google…</span>
              </span>
            ) : (
              <>
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span className="text-slate-800 font-semibold">Sign in with Google</span>
              </>
            )}
          </button>

          <p className="text-center text-xs text-slate-400 mt-5 leading-relaxed">
            Please use your authorized Google account (<code className="text-slate-300">@rotaractjpnagar.org</code> or approved administrator email).
          </p>
        </div>

        <p className="text-center text-xs text-slate-500 mt-8">
          Rotaract Club of Bangalore JP Nagar • RI District 3191
        </p>
      </div>
    </div>
  );
};
