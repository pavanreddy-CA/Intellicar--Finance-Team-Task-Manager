"use client";

export default function HomeHub() {
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "32px", background: "#f8fafc" }}>
      {/* Breadcrumb and Header */}

      {/* Mission Section */}
      <div style={{
        background: "#1e293b",
        borderRadius: "16px",
        padding: "48px",
        marginBottom: "32px",
        backgroundImage: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
        position: "relative",
        overflow: "hidden"
      }}>
        {/* Background accent */}
        <div style={{
          position: "absolute",
          right: "-50px",
          top: "-50px",
          width: "300px",
          height: "300px",
          background: "rgba(59, 130, 246, 0.1)",
          borderRadius: "50%",
          filter: "blur(100px)"
        }} />
        
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "#60a5fa",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}>
            <div style={{ width: "24px", height: "2px", background: "#60a5fa" }} />
            OUR MISSION
          </div>
          <h2 style={{
            fontSize: "2.5rem",
            fontWeight: 700,
            color: "#ffffff",
            lineHeight: 1.3,
            marginBottom: "16px"
          }}>
            Empowering the Finance Team through transparency, real-time collaboration, and operational excellence.
          </h2>
          <p style={{
            fontSize: "1rem",
            color: "#cbd5e1",
            lineHeight: 1.6
          }}>
            This platform is implemented to drive efficiency and ensure every team member has the data they need to succeed.
          </p>
        </div>
      </div>

      {/* Two Column Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>
        {/* Team Success Stories */}
        <div>
          <h3 style={{
            fontSize: "1.125rem",
            fontWeight: 700,
            color: "#0f172a",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "12px"
          }}>
            <span style={{ fontSize: "1.5rem" }}>👥</span>
            Team Success Stories
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[
              { title: "Efficiency Boost", description: "The new matrix system has cut down our task allocation time by 40%" },
              { title: "Better Collaboration", description: "Sharing requests between departments is now seamless" }
            ].map((item, idx) => (
              <div key={idx} style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "20px",
                cursor: "pointer",
                transition: "all 0.3s",
                display: "flex",
                gap: "12px"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 10px 25px rgba(0,0,0,0.08)";
                e.currentTarget.style.borderColor = "#cbd5e1";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.borderColor = "#e2e8f0";
              }}>
                <div style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  background: "#dbeafe",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <span style={{ fontSize: "1.5rem" }}>✓</span>
                </div>
                <div>
                  <h4 style={{ fontSize: "0.875rem", fontWeight: 600, color: "#0f172a", marginBottom: "4px" }}>
                    {item.title}
                  </h4>
                  <p style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Major Achievements */}
        <div>
          <h3 style={{
            fontSize: "1.125rem",
            fontWeight: 700,
            color: "#0f172a",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "12px"
          }}>
            <span style={{ fontSize: "1.5rem" }}>💎</span>
            Major Achievements
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[
              { title: "Platform Launch", date: "Apr 2026", icon: "🚀" },
              { title: "100+ Tasks Completed", date: "", icon: "✨" }
            ].map((item, idx) => (
              <div key={idx} style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "20px",
                display: "flex",
                gap: "12px"
              }}>
                <div style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  background: "#f0fdf4",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: "1.5rem"
                }}>
                  {item.icon}
                </div>
                <div>
                  <h4 style={{ fontSize: "0.875rem", fontWeight: 600, color: "#0f172a", marginBottom: "4px" }}>
                    {item.title}
                  </h4>
                  {item.date && (
                    <p style={{ fontSize: "0.75rem", color: "#64748b" }}>
                      {item.date}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
