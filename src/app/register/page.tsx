"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Register() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to register");
      }

      router.push("/login");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f2f5" }}>
      <div style={{ background: "white", padding: "40px", borderRadius: "8px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", width: "100%", maxWidth: "400px" }}>
        <h1 style={{ textAlign: "center", marginBottom: "24px", color: "#1a73e8" }}>Create Account</h1>
        
        {error && (
          <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "12px", borderRadius: "4px", marginBottom: "16px", fontSize: "14px" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ width: "100%", padding: "10px", borderRadius: "4px", border: "1px solid #ccc" }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: "100%", padding: "10px", borderRadius: "4px", border: "1px solid #ccc" }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: "100%", padding: "10px", borderRadius: "4px", border: "1px solid #ccc" }}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              background: "#1a73e8", color: "white", padding: "12px", borderRadius: "4px", border: "none", 
              fontWeight: "bold", cursor: loading ? "not-allowed" : "pointer", marginTop: "8px" 
            }}
          >
            {loading ? "Creating..." : "Register"}
          </button>
        </form>
        <p style={{ textAlign: "center", marginTop: "16px", fontSize: "14px" }}>
          Already have an account? <a href="/login" style={{ color: "#1a73e8" }}>Sign In</a>
        </p>
      </div>
    </div>
  );
}
