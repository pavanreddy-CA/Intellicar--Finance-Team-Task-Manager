"use client"; // Force Build: Premium UI Update

import { useState, useEffect } from "react";

export default function HomeHubPremium() {
  const [content, setContent] = useState<any>({
    mission: "Empowering the Finance Team through transparency, real-time collaboration, and operational excellence.",
    stories: [
      { title: "Efficiency Boost", text: "The new matrix system has cut down our task allocation time by 40%", author: "Finance Admin" },
      { title: "Better Collaboration", text: "Sharing requests between departments is now seamless", author: "Operations Lead" }
    ],
    achievements: [
      { title: "Platform Launch", date: "Apr 2026", icon: "🚀" },
      { title: "100+ Tasks Completed", date: "", icon: "✨" }
    ]
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const res = await fetch("/api/public-settings");
        if (res.ok) {
          const data = await res.json();
          if (data.homeContent) {
            const parsed = JSON.parse(data.homeContent);
            setContent({
              mission: parsed.mission || content.mission,
              stories: parsed.stories && parsed.stories.length > 0 ? parsed.stories : content.stories,
              achievements: parsed.achievements && parsed.achievements.length > 0 ? parsed.achievements : content.achievements
            });
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

  const storyColors = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b"];
  const achievementColors = ["#10b981", "#06b6d4", "#6366f1", "#f43f5e"];

  if (isLoading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f8fafc" }}>
        <div style={{ textAlign: "center" }}>
          <div className="loader" style={{ 
            width: "40px", height: "40px", border: "4px solid #e2e8f0", borderTop: "4px solid #3b82f6", 
            borderRadius: "50%", margin: "0 auto 16px" 
          }}></div>
          <div style={{ fontSize: "1rem", color: "#64748b", fontWeight: 600, letterSpacing: "0.02em" }}>Loading Workspace...</div>
        </div>
      </div>
    );
  }

  return (
    <div key="premium-home-v2" style={{ 
      flex: 1, overflowY: "auto", padding: "40px", background: "#f8fafc",
      backgroundImage: "radial-gradient(at 0% 0%, rgba(59, 130, 246, 0.05) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(139, 92, 246, 0.05) 0px, transparent 50%)",
      minHeight: "100vh"
    }}>
      {/* Premium Mission Header */}
      <div style={{
        background: "#1e293b",
        borderRadius: "24px",
        padding: "60px",
        marginBottom: "48px",
        backgroundImage: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        border: "1px solid rgba(255,255,255,0.05)"
      }}>
        {/* Animated Background Accents */}
        <div style={{
          position: "absolute",
          right: "-100px",
          top: "-100px",
          width: "400px",
          height: "400px",
          background: "radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)",
          borderRadius: "50%",
        }} />
        <div style={{
          position: "absolute",
          left: "20%",
          bottom: "-50px",
          width: "200px",
          height: "200px",
          background: "radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)",
          borderRadius: "50%",
        }} />
        
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{
            fontSize: "0.9rem",
            fontWeight: 800,
            color: "#60a5fa",
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            gap: "12px"
          }}>
            <div style={{ width: "32px", height: "3px", background: "linear-gradient(to right, #3b82f6, transparent)", borderRadius: "2px" }} />
            OUR MISSION
          </div>
          <h2 style={{
            fontSize: "2.75rem",
            fontWeight: 800,
            color: "#ffffff",
            lineHeight: 1.2,
            marginBottom: "24px",
            maxWidth: "900px",
            letterSpacing: "-0.02em",
            textShadow: "0 2px 4px rgba(0,0,0,0.2)"
          }}>
            {content.mission}
          </h2>
          <p style={{
            fontSize: "1.1rem",
            color: "#94a3b8",
            lineHeight: 1.7,
            maxWidth: "700px"
          }}>
            This unified platform drives efficiency and ensures every team member has the data needed to achieve operational excellence.
          </p>
        </div>
      </div>

      {/* Main Grid Section */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "48px" }}>
        
        {/* Team Success Stories Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <h3 style={{
              fontSize: "1.5rem",
              fontWeight: 800,
              color: "#0f172a",
              display: "flex",
              alignItems: "center",
              gap: "16px",
              letterSpacing: "-0.02em"
            }}>
              <div style={{ 
                width: "48px", height: "48px", background: "#eff6ff", borderRadius: "14px", 
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem" 
              }}>👥</div>
              Team Success Stories
            </h3>
            <div style={{ fontSize: "0.875rem", color: "#64748b", fontWeight: 500, background: "#f1f5f9", padding: "6px 12px", borderRadius: "20px" }}>
              Latest Highlights
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px" }}>
            {content.stories.map((item: any, idx: number) => {
              const color = storyColors[idx % storyColors.length];
              return (
                <div key={idx} style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "24px",
                  padding: "32px",
                  display: "flex",
                  gap: "24px",
                  position: "relative",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
                  borderLeft: `6px solid ${color}`,
                  overflow: "hidden"
                }} className="hover-card">
                  {/* Subtle background glow */}
                  <div style={{
                    position: "absolute",
                    right: "-20px",
                    bottom: "-20px",
                    width: "100px",
                    height: "100px",
                    background: color,
                    opacity: 0.03,
                    borderRadius: "50%",
                    filter: "blur(40px)"
                  }} />

                  <div style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "20px",
                    background: `${color}15`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    fontSize: "1.75rem",
                    color: color,
                    fontWeight: 800,
                    boxShadow: `inset 0 0 0 1px ${color}20`
                  }}>
                    {item.author?.[0] || "✓"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#0f172a", marginBottom: "8px", letterSpacing: "-0.01em" }}>
                      {item.title}
                    </h4>
                    <p style={{ fontSize: "0.95rem", color: "#475569", lineHeight: 1.6, marginBottom: "16px" }}>
                      {item.text || item.description}
                    </p>
                    <div style={{ 
                      display: "flex", alignItems: "center", gap: "8px", 
                      padding: "8px 12px", background: "#f8fafc", borderRadius: "12px", 
                      width: "fit-content", border: "1px solid #f1f5f9" 
                    }}>
                      <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: color }} />
                      <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {item.author}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Major Achievements Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <h3 style={{
            fontSize: "1.5rem",
            fontWeight: 800,
            color: "#0f172a",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            letterSpacing: "-0.02em"
          }}>
            <div style={{ 
              width: "48px", height: "48px", background: "#f0fdf4", borderRadius: "14px", 
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem" 
            }}>💎</div>
            Achievements
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {content.achievements.map((item: any, idx: number) => {
              const color = achievementColors[idx % achievementColors.length];
              return (
                <div key={idx} style={{
                  background: "linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)",
                  border: "1px solid #e2e8f0",
                  borderRadius: "20px",
                  padding: "24px",
                  display: "flex",
                  alignItems: "center",
                  gap: "20px",
                  transition: "transform 0.2s ease",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
                }}>
                  <div style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "16px",
                    background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    fontSize: "1.75rem",
                    color: "#ffffff",
                    boxShadow: `0 8px 16px -4px ${color}40`
                  }}>
                    {item.icon || "✨"}
                  </div>
                  <div>
                    <h4 style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>
                      {item.title}
                    </h4>
                    {item.date && (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#94a3b8" }} />
                        <span style={{ fontSize: "0.8125rem", color: "#64748b", fontWeight: 500 }}>
                          {item.date}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* New Productivity Card */}
          <div style={{
            marginTop: "24px",
            background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
            borderRadius: "24px",
            padding: "32px",
            color: "white",
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 10px 15px -3px rgba(37, 99, 235, 0.3)"
          }}>
             <div style={{
              position: "absolute",
              right: "-20px",
              bottom: "-20px",
              fontSize: "6rem",
              opacity: 0.1,
              transform: "rotate(-15deg)"
            }}>📈</div>
            <h4 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: "12px", position: "relative" }}>Team Pulse</h4>
            <p style={{ fontSize: "0.9rem", opacity: 0.9, lineHeight: 1.6, position: "relative" }}>
              Our operational efficiency is at an all-time high. Keep pushing the boundaries of what's possible!
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .loader {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .hover-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 20px -5px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
}
