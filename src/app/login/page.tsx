"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"LOGIN" | "FORGOT_PASSWORD" | "OTP_VERIFY" | "RESET_PASSWORD">("LOGIN");
  const [forgotEmail, setForgotEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: forgotEmail }),
      });
      if (res.ok) setView("OTP_VERIFY");
      else setError((await res.json()).message || "Failed to send OTP");
    } catch (err) { setError("An error occurred"); }
    finally { setOtpLoading(false); }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ email: forgotEmail, otp }),
      });
      if (res.ok) setView("RESET_PASSWORD");
      else setError((await res.json()).message || "Invalid OTP");
    } catch (err) { setError("An error occurred"); }
    finally { setOtpLoading(false); }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ email: forgotEmail, otp, newPassword }),
      });
      if (res.ok) {
        alert("Password reset successfully!");
        setView("LOGIN");
      } else setError((await res.json()).message || "Failed to reset password");
    } catch (err) { setError("An error occurred"); }
    finally { setOtpLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Call custom login API
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include", // Include cookies in request
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }
      
      // Success! Redirect to dashboard
      if (data.success) {
        // Use window.location for full page reload to ensure cookie is sent
        setTimeout(() => {
          window.location.href = "/";
        }, 200);
      } else {
        setError(data.error || "Login failed");
        setLoading(false);
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again later.");
      setLoading(false);
    }
  };

  return (
    <div className="login-container" style={{ minHeight: "100vh", display: "flex", background: "white", fontFamily: "'Inter', sans-serif" }}>
      {/* Left Side: Hero Section */}
      <div style={{ 
        flex: 1.2, 
        position: 'relative',
        display: 'flex'
      }}>
        <div style={{ 
          position: 'absolute', 
          inset: 0, 
          backgroundImage: 'url("https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=2070")',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}></div>
        <div style={{ 
          position: 'absolute', 
          inset: 0, 
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 64, 175, 0.85) 100%)', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          padding: '80px', 
          color: 'white' 
        }}>
          <h2 style={{ fontSize: '3.2rem', fontWeight: 800, marginBottom: '24px', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
            Empowering<br />
            Financial Clarity & <span style={{ color: '#60a5fa' }}>Excellence.</span>
          </h2>
          <p style={{ fontSize: '1.25rem', opacity: 0.9, maxWidth: '480px', lineHeight: 1.6, color: '#e2e8f0' }}>
            Manage tasks, analyze performance, and optimize financial workflows with ease.
          </p>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        alignItems: 'center', 
        padding: '40px',
        background: '#f8fafc'
      }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <img
              src="/logo.png"
              alt="Intellicar Logo"
              style={{ width: '180px', height: 'auto', objectFit: 'contain', marginBottom: '16px' }}
            />
          </div>

          {view === "LOGIN" && (
            <>
              <div style={{ marginBottom: '32px', textAlign: 'center' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                  Connect With <span style={{ color: '#2563eb' }}>FinPulse</span>
                </h1>
                <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Please enter your credentials to access the hub.</p>
              </div>
              
              {error && (
                <div style={{ background: "#fef2f2", color: "#b91c1c", padding: "14px", borderRadius: "12px", marginBottom: "24px", fontSize: "0.875rem", border: "1px solid #fee2e2", display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.25rem' }}>⚠️</span> {error}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div style={{ position: 'relative' }}>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: '0.875rem', fontWeight: 600, color: "#334155" }}>Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@intellicar.in"
                      required
                      style={{ 
                        width: "100%", padding: "12px 12px 12px 44px", borderRadius: "12px", border: "1px solid #e2e8f0", 
                        fontSize: '1rem', outline: 'none', transition: 'all 0.2s', background: 'white'
                      }}
                    />
                  </div>
                </div>

                <div style={{ position: 'relative' }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 600, color: "#334155" }}>Password</label>
                    <button type="button" onClick={() => setView("FORGOT_PASSWORD")} style={{ fontSize: "0.8125rem", color: "#2563eb", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}>Forgot Password?</button>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      style={{ 
                        width: "100%", padding: "12px 44px 12px 44px", borderRadius: "12px", border: "1px solid #e2e8f0", 
                        fontSize: '1rem', outline: 'none', transition: 'all 0.2s', background: 'white'
                      }}
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center' }}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  style={{ 
                    background: "linear-gradient(135deg, #2563eb 0%, #1e40af 100%)", color: "white", padding: "14px", 
                    borderRadius: "12px", border: "none", fontWeight: 700, fontSize: '1rem',
                    cursor: loading ? "not-allowed" : "pointer", marginTop: "12px",
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)', transition: 'all 0.2s'
                  }}
                >
                  {loading ? "Signing in..." : <>Sign In <ArrowRight size={18} /></>}
                </button>
              </form>
            </>
          )}

          {view === "FORGOT_PASSWORD" && (
            <div style={{ textAlign: "center" }}>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "16px" }}>Reset Password</h2>
              <p style={{ color: "#64748b", marginBottom: "24px" }}>Enter your email to receive a 6-digit OTP.</p>
              {error && <div style={{ color: "#ef4444", marginBottom: "16px" }}>{error}</div>}
              <form onSubmit={handleForgotPassword} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <input 
                  type="email" 
                  placeholder="name@intellicar.in" 
                  value={forgotEmail} 
                  onChange={(e) => setForgotEmail(e.target.value)} 
                  required 
                  style={{ padding: "12px", borderRadius: "12px", border: "1px solid #e2e8f0" }} 
                />
                <button type="submit" disabled={otpLoading} style={{ padding: "14px", background: "#2563eb", color: "white", borderRadius: "12px", border: "none", fontWeight: 700 }}>
                  {otpLoading ? "Sending..." : "Send OTP"}
                </button>
                <button type="button" onClick={() => setView("LOGIN")} style={{ color: "#64748b", background: "none", border: "none", cursor: "pointer" }}>Back to Login</button>
              </form>
            </div>
          )}

          {view === "OTP_VERIFY" && (
            <div style={{ textAlign: "center" }}>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "16px" }}>Verify OTP</h2>
              <p style={{ color: "#64748b", marginBottom: "24px" }}>Sent to {forgotEmail}</p>
              {error && <div style={{ color: "#ef4444", marginBottom: "16px" }}>{error}</div>}
              <form onSubmit={handleVerifyOtp} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <input 
                  type="text" 
                  placeholder="6-digit code" 
                  value={otp} 
                  onChange={(e) => setOtp(e.target.value)} 
                  maxLength={6}
                  required 
                  style={{ padding: "12px", borderRadius: "12px", border: "1px solid #e2e8f0", textAlign: "center", fontSize: "1.5rem", letterSpacing: "8px" }} 
                />
                <button type="submit" disabled={otpLoading} style={{ padding: "14px", background: "#2563eb", color: "white", borderRadius: "12px", border: "none", fontWeight: 700 }}>
                  {otpLoading ? "Verifying..." : "Verify OTP"}
                </button>
                <button type="button" onClick={() => setView("FORGOT_PASSWORD")} style={{ color: "#64748b", background: "none", border: "none", cursor: "pointer" }}>Resend OTP</button>
              </form>
            </div>
          )}

          {view === "RESET_PASSWORD" && (
            <div style={{ textAlign: "center" }}>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "16px" }}>New Password</h2>
              <p style={{ color: "#64748b", marginBottom: "24px" }}>Set your new secure password.</p>
              {error && <div style={{ color: "#ef4444", marginBottom: "16px" }}>{error}</div>}
              <form onSubmit={handleResetPassword} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <input 
                  type="password" 
                  placeholder="New Password" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  required 
                  style={{ padding: "12px", borderRadius: "12px", border: "1px solid #e2e8f0" }} 
                />
                <button type="submit" disabled={otpLoading} style={{ padding: "14px", background: "#2563eb", color: "white", borderRadius: "12px", border: "none", fontWeight: 700 }}>
                  {otpLoading ? "Resetting..." : "Reset Password"}
                </button>
              </form>
            </div>
          )}

          <div style={{ textAlign: "center", marginTop: "32px", borderTop: '1px solid #e2e8f0', paddingTop: '24px' }}>
            <p style={{ color: "#64748b", fontSize: "0.9rem" }}>
              Don't have an account? <Link href="/register" style={{ color: "#2563eb", fontWeight: 700, textDecoration: 'none' }}>Request Access</Link>
            </p>
          </div>
        </div>
        
        <div style={{ marginTop: 'auto', paddingTop: '40px', textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>© 2026 Intellicar Telematics. All rights reserved.</p>
        </div>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        body { margin: 0; }
      `}</style>
    </div>
  );
}
