"use client";

import { useState, useEffect } from "react";
import DashboardClient from "@/components/DashboardClient";

export default function DashboardWrapper({ user }: { user: any }) {
  const [showHome, setShowHome] = useState(false);
  const [content, setContent] = useState<any>({
    mission: "Empowering the Finance Team through transparency, real-time collaboration, and operational excellence.",
    stories: [],
    achievements: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const res = await fetch("/api/public-settings");
        if (res.ok) {
          const data = await res.json();
          if (data && data.homeContent) {
            try {
              const parsed = JSON.parse(data.homeContent);
              setContent({
                mission: parsed.mission || content.mission,
                stories: parsed.stories || [],
                achievements: parsed.achievements || []
              });
            } catch (e) {
              console.error("Failed to parse home content", e);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch home content", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchContent();
  }, []);

  if (showHome) {
    const storyColors = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b"];
    const achievementColors = ["#10b981", "#06b6d4", "#6366f1", "#f43f5e"];

    return (
      <div style={{ 
        height: "100vh", display: "flex", flexDirection: "column", 
        background: "#f0f7ff", // Subtle light blue background to confirm update
        color: "#0f172a", overflow: "hidden" 
      }}>
        <header style={{ 
          height: "80px", width: "100%", background: "#ffffff", display: "flex", 
          alignItems: "center", justifyContent: "space-between", padding: "0 32px", 
          borderBottom: "1px solid #e2e8f0", zIndex: 100, flexShrink: 0
        }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <img src="/logo.png" alt="Logo" style={{ height: "40px" }} />
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <button onClick={() => setShowHome(false)} style={{ padding: "8px 16px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 600, cursor: "pointer" }}>
              Go to Tasks
            </button>
          </div>
        </header>

        <main style={{ flex: 1, overflowY: "auto", padding: "40px" }}>
           {/* Premium Mission Header */}
          <div style={{
            background: "#1e293b",
            borderRadius: "24px",
            padding: "60px",
            marginBottom: "40px",
            backgroundImage: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
            color: "white"
          }}>
            <h2 style={{ fontSize: "2.5rem", fontWeight: 800, marginBottom: "20px" }}>{content.mission}</h2>
            <p style={{ color: "#94a3b8", fontSize: "1.1rem" }}>Workspace Mission & Operational Goals</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>
            {/* Stories */}
            <div>
               <h3 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
                 <span style={{ padding: "8px", background: "#dbeafe", borderRadius: "12px" }}>👥</span> Success Stories
               </h3>
               <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                 {content.stories.length > 0 ? content.stories.map((s: any, i: number) => (
                   <div key={i} style={{ padding: "24px", background: "white", borderRadius: "20px", borderLeft: `6px solid ${storyColors[i % 4]}`, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
                     <h4 style={{ fontWeight: 800, marginBottom: "8px" }}>{s.title}</h4>
                     <p style={{ fontSize: "0.9rem", color: "#64748b" }}>{s.text}</p>
                     <p style={{ fontSize: "0.75rem", fontWeight: 700, color: storyColors[i % 4], marginTop: "12px" }}>- {s.author}</p>
                   </div>
                 )) : <div style={{ padding: "20px", background: "white", borderRadius: "16px", color: "#64748b" }}>No stories yet. Add one in Control Center!</div>}
               </div>
            </div>

            {/* Achievements */}
            <div>
               <h3 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
                 <span style={{ padding: "8px", background: "#dcfce7", borderRadius: "12px" }}>💎</span> Achievements
               </h3>
               <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                 {content.achievements.length > 0 ? content.achievements.map((a: any, i: number) => (
                   <div key={i} style={{ padding: "20px", background: "white", borderRadius: "16px", display: "flex", alignItems: "center", gap: "16px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                     <div style={{ fontSize: "1.5rem", width: "48px", height: "48px", background: `${achievementColors[i % 4]}15`, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "12px" }}>{a.icon || "🏆"}</div>
                     <div>
                       <div style={{ fontWeight: 700 }}>{a.title}</div>
                       <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{a.date}</div>
                     </div>
                   </div>
                 )) : <div style={{ padding: "20px", background: "white", borderRadius: "16px", color: "#64748b" }}>No achievements yet.</div>}
               </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return <DashboardClient user={user} />;
}
