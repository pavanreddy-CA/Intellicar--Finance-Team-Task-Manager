"use client";

import { useState } from "react";
import HomeHub from "@/components/HomeHub";
import DashboardClient from "@/components/DashboardClient";

export default function DashboardWrapper({ user }: { user: any }) {
  const [showHome, setShowHome] = useState(true);

  if (showHome) {
    return (
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#f8fafc", color: "#0f172a", overflow: "hidden" }}>
        {/* Top Navigation Bar */}
        <header style={{ 
          height: "80px", width: "100%", background: "#ffffff", display: "flex", 
          alignItems: "center", justifyContent: "space-between", padding: "0 32px", 
          borderBottom: "1px solid #e2e8f0", zIndex: 100, flexShrink: 0,
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
        }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <img src="/logo.png" alt="Logo" style={{ height: "40px", width: "auto", objectFit: "contain" }} />
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={() => setShowHome(false)}
              style={{ padding: "8px 16px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 500, cursor: "pointer", fontSize: "0.875rem" }}
            >
              Go to Tasks
            </button>
            <button
              onClick={() => { document.cookie = "session-token=; path=/; max-age=0"; window.location.href = "/login"; }}
              style={{ padding: "8px 16px", background: "#f8fafc", color: "#475569", border: "1px solid #cbd5e1", borderRadius: "8px", fontWeight: 500, cursor: "pointer", fontSize: "0.875rem" }}
            >
              Logout
            </button>
          </div>
        </header>

        {/* Home Hub Content */}
        <HomeHub />
      </div>
    );
  }

  // Show the full dashboard when not on home view
  return <DashboardClient user={user} />;
}
