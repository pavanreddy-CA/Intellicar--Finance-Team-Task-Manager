"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
        credentials: "include",
      });
      
      const data = await response.json();
      console.log("[Login] Response:", data);
      
      if (!response.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }
      
      // Add a small delay to ensure cookie is set before redirecting
      console.log("[Login] Redirecting to dashboard...");
      setTimeout(() => {
        router.push("/");
        // Also call router.refresh() to revalidate session
        router.refresh();
      }, 100);
    } catch (err) {
      console.error("[Login] Error:", err);
      setError("An unexpected error occurred. Please try again later.");
      setLoading(false);
    }
  };

  return (
    <div className="login-container" style={{ minHeight: "100vh", display: "flex", background: "white", fontFamily: "'Inter', sans-serif" }}>
      {/* Left Side: Hero Section */}
      <div className="hero-side" style={{ 
        flex: 1.2, 
        position: 'relative'
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
          {/* Logo in top-left corner */}

          <h2 style={{ fontSize: '3.5rem', fontWeight: 800, marginBottom: '24px', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            Empowering Finance <br /><span style={{ color: '#60a5fa' }}>Excellence.</span>
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
             <img src="/logo.png" alt="Intellicar Logo" style={{ height: "56px", marginBottom: '16px' }} />
          </div>

          <div style={{ marginBottom: '32px', textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>Welcome Back</h1>
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
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#2563eb';
                    e.currentTarget.style.boxShadow = '0 0 0 4px rgba(37, 99, 235, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            <div style={{ position: 'relative' }}>
              <label style={{ display: "block", marginBottom: "8px", fontSize: '0.875rem', fontWeight: 600, color: "#334155" }}>Password</label>
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
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#2563eb';
                    e.currentTarget.style.boxShadow = '0 0 0 4px rgba(37, 99, 235, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.boxShadow = 'none';
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
              onMouseOver={(e) => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseOut={(e) => { if (!loading) e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {loading ? "Signing in..." : <>Sign In <ArrowRight size={18} /></>}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: "32px", borderTop: '1px solid #e2e8f0', paddingTop: '24px' }}>
            <p style={{ color: "#64748b", fontSize: "0.9rem" }}>
              Don't have an account? <a href="/register" style={{ color: "#2563eb", fontWeight: 700, textDecoration: 'none' }}>Request Access</a>
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
        @media (max-width: 1023px) {
          .hero-side { display: none !important; }
        }
      `}</style>
    </div>
  );
}
