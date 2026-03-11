import { useState, useEffect } from "react";

const API = "https://nova-agent-production-8bcc.up.railway.app";
const ADMIN_CODE = "NOVA_GENIE-44!/";

export default function Admin() {
  const [authenticated, setAuthenticated] = useState(true);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");

  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [directives, setDirectives] = useState("");
  const [newDirective, setNewDirective] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [userConvs, setUserConvs] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [convSummary, setConvSummary] = useState(null);
  const [loadingSum, setLoadingSum] = useState(false);
  const [activeTab, setActiveTab] = useState("stats");

  const headers = { "Content-Type": "application/json", "x-admin-code": ADMIN_CODE };

  const login = async () => {
    const res = await fetch(`${API}/api/admin/auth`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    if (res.ok) setAuthenticated(true);
    else setCodeError("Code incorrect");
  };

  useEffect(() => {
    if (authenticated) { loadStats(); loadUsers(); loadDirectives(); }
  }, [authenticated]);

  const loadStats = async () => {
    const res = await fetch(`${API}/api/admin/stats`, { headers });
    const data = await res.json();
    setStats(data);
  };

  const loadUsers = async () => {
    const res = await fetch(`${API}/api/admin/users`, { headers });
    const data = await res.json();
    setUsers(data.users || []);
  };

  const loadDirectives = async () => {
    const res = await fetch(`${API}/api/directives`);
    const data = await res.json();
    setDirectives(data.directives || "");
  };

  const addDirective = async () => {
    if (!newDirective.trim()) return;
    await fetch(`${API}/api/directives/add`, {
      method: "POST", headers,
      body: JSON.stringify({ directive: newDirective }),
    });
    setNewDirective("");
    loadDirectives();
  };

  const removeDirective = async (line) => {
    const clean = line.replace(/^-\s*/, "").trim();
    await fetch(`${API}/api/directives/remove`, {
      method: "POST", headers,
      body: JSON.stringify({ directive: clean }),
    });
    loadDirectives();
  };

  const clearDirectives = async () => {
    if (!confirm("Effacer toutes les directives ?")) return;
    await fetch(`${API}/api/directives`, { method: "DELETE", headers });
    loadDirectives();
  };

  const setPremium = async (userId, plan) => {
    await fetch(`${API}/api/admin/set-premium`, {
      method: "POST", headers,
      body: JSON.stringify({ user_id: userId, plan }),
    });
    loadUsers();
  };

  const openUser = async (user) => {
    setSelectedUser(user);
    setSelectedConv(null);
    setConvSummary(null);
    const res = await fetch(`${API}/api/admin/user-conversations/${user.user_id}`, { headers });
    const data = await res.json();
    setUserConvs(data.conversations || []);
  };

  const openConv = async (conv) => {
    setSelectedConv(conv);
    setLoadingSum(true);
    setConvSummary(null);
    const res = await fetch(`${API}/api/admin/conversation-summary/${conv.id}`, { headers });
    const data = await res.json();
    setConvSummary(data);
    setLoadingSum(false);
  };

  if (!authenticated) return (
    <div style={s.root}>
      <style>{css}</style>
      <div style={s.loginBox}>
        <h1 style={s.logoTitle}>NOVA</h1>
        <p style={s.logoSub}>Bureau Admin</p>
        <input style={s.input} type="password" placeholder="Code d'accès admin" value={code}
          onChange={e => setCode(e.target.value)} onKeyDown={e => e.key === "Enter" && login()} />
        {codeError && <p style={s.error}>{codeError}</p>}
        <button style={s.btn} onClick={login}>Accéder</button>
      </div>
    </div>
  );

  return (
    <div style={s.root}>
      <style>{css}</style>
      <div style={s.layout}>

        {/* Sidebar nav */}
        <div style={s.nav}>
          <div style={s.navLogo}>
            <span style={s.navTitle}>NOVA</span>
            <span style={s.navSub}>Admin</span>
          </div>
          {["stats", "users", "directives"].map(tab => (
            <button key={tab} style={{ ...s.navBtn, ...(activeTab === tab ? s.navBtnActive : {}) }}
              onClick={() => { setActiveTab(tab); setSelectedUser(null); setSelectedConv(null); }}>
              {tab === "stats" ? "📊 Statistiques" : tab === "users" ? "👥 Utilisateurs" : "✦ Directives"}
            </button>
          ))}
          <div style={s.navDivider} />
          <a href="/?admin_access=NOVA_GENIE-44!/" target="_blank" style={s.navLink}>🌙 Ouvrir NOVA</a>
        </div>

        {/* Main content */}
        <div style={s.main}>

          {/* STATS */}
          {activeTab === "stats" && (
            <div style={s.section}>
              <h2 style={s.sectionTitle}>Statistiques globales</h2>
              <div style={s.statsGrid}>
                <div style={s.statCard}>
                  <div style={s.statNum}>{stats?.totalUsers ?? "—"}</div>
                  <div style={s.statLabel}>Utilisateurs inscrits</div>
                </div>
                <div style={s.statCard}>
                  <div style={s.statNum}>{stats?.premiumUsers ?? "—"}</div>
                  <div style={s.statLabel}>Comptes Premium</div>
                </div>
                <div style={s.statCard}>
                  <div style={s.statNum}>{stats?.totalToday ?? "—"}</div>
                  <div style={s.statLabel}>Messages aujourd'hui</div>
                </div>
              </div>
            </div>
          )}

          {/* USERS */}
          {activeTab === "users" && !selectedUser && (
            <div style={s.section}>
              <h2 style={s.sectionTitle}>Utilisateurs ({users.length})</h2>
              <div style={s.table}>
                <div style={s.tableHeader}>
                  <span style={{ flex: 3 }}>Email</span>
                  <span style={{ flex: 1, textAlign: "center" }}>Plan</span>
                  <span style={{ flex: 1, textAlign: "center" }}>Msg/jour</span>
                  <span style={{ flex: 1, textAlign: "center" }}>Convs</span>
                  <span style={{ flex: 1, textAlign: "center" }}>Actions</span>
                </div>
                {users.map(u => (
                  <div key={u.user_id} style={s.tableRow} className="table-row" onClick={() => openUser(u)}>
                    <span style={{ flex: 3, color: "#e8d8b8", fontSize: 13 }}>{u.email}</span>
                    <span style={{ flex: 1, textAlign: "center" }}>
                      <span style={{ ...s.badge, ...(u.plan === "premium" ? s.badgePremium : s.badgeFree) }}>
                        {u.plan || "free"}
                      </span>
                    </span>
                    <span style={{ flex: 1, textAlign: "center", color: "#a09080", fontSize: 13 }}>{u.messages_today || 0}</span>
                    <span style={{ flex: 1, textAlign: "center", color: "#a09080", fontSize: 13 }}>{u.total_conversations || 0}</span>
                    <span style={{ flex: 1, textAlign: "center" }} onClick={e => e.stopPropagation()}>
                      {u.plan !== "premium"
                        ? <button style={s.smallBtn} onClick={() => setPremium(u.user_id, "premium")}>→ Premium</button>
                        : <button style={{ ...s.smallBtn, ...s.smallBtnRed }} onClick={() => setPremium(u.user_id, "free")}>→ Gratuit</button>
                      }
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* USER DETAIL */}
          {activeTab === "users" && selectedUser && !selectedConv && (
            <div style={s.section}>
              <button style={s.backBtn} onClick={() => setSelectedUser(null)}>← Retour</button>
              <h2 style={s.sectionTitle}>{selectedUser.email}</h2>
              <p style={s.userMeta}>Plan : <strong style={{ color: "#d4a84b" }}>{selectedUser.plan || "free"}</strong> · {selectedUser.total_conversations || 0} conversations</p>
              <h3 style={s.subTitle}>Conversations</h3>
              {userConvs.length === 0 && <p style={s.empty}>Aucune conversation pour le moment.</p>}
              {userConvs.map(c => (
                <div key={c.id} style={s.convItem} className="conv-item-admin" onClick={() => openConv(c)}>
                  <span style={s.convTitle}>{c.title}</span>
                  <span style={s.convDate}>{new Date(c.updated_at).toLocaleDateString("fr-FR")}</span>
                </div>
              ))}
            </div>
          )}

          {/* CONVERSATION SUMMARY */}
          {activeTab === "users" && selectedConv && (
            <div style={s.section}>
              <button style={s.backBtn} onClick={() => { setSelectedConv(null); setConvSummary(null); }}>← Retour</button>
              <h2 style={s.sectionTitle}>{selectedConv.title}</h2>
              <div style={s.summaryBox}>
                <p style={s.summaryLabel}>✦ Résumé par NOVA</p>
                {loadingSum ? <p style={s.empty}>Génération du résumé...</p> : <p style={s.summaryText}>{convSummary?.summary}</p>}
              </div>
              <h3 style={s.subTitle}>Messages</h3>
              <div style={s.msgList}>
                {convSummary?.messages?.map((m, i) => (
                  <div key={i} style={{ ...s.msgItem, ...(m.role === "user" ? s.msgUser : s.msgNova) }}>
                    <span style={s.msgRole}>{m.role === "user" ? "Utilisateur" : "✦ Nova"}</span>
                    <p style={s.msgContent}>{m.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DIRECTIVES */}
          {activeTab === "directives" && (
            <div style={s.section}>
              <h2 style={s.sectionTitle}>Directives de NOVA</h2>
              <p style={s.hint}>Ces directives s'appliquent à tous les utilisateurs.</p>
              <div style={s.directivesList}>
                {directives ? directives.split("\n").map((line, i) => (
                  <div key={i} style={s.directiveItem}>
                    <span style={s.directiveText}>{line}</span>
                    <button style={s.removeBtn} onClick={() => removeDirective(line)}>✕</button>
                  </div>
                )) : <p style={s.empty}>Aucune directive active.</p>}
              </div>
              <div style={s.addDirective}>
                <input style={s.input} placeholder="Nouvelle directive..." value={newDirective}
                  onChange={e => setNewDirective(e.target.value)} onKeyDown={e => e.key === "Enter" && addDirective()} />
                <button style={s.btn} onClick={addDirective}>Ajouter</button>
              </div>
              {directives && <button style={{ ...s.btn, ...s.btnRed, marginTop: 16 }} onClick={clearDirectives}>Effacer toutes les directives</button>}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

const s = {
  root: { minHeight: "100vh", background: "#050508", color: "#e8d8b8", fontFamily: "'Palatino Linotype', serif" },
  loginBox: { display: "flex", flexDirection: "column", alignItems: "center", gap: 16, maxWidth: 360, margin: "0 auto", paddingTop: 120 },
  logoTitle: { fontFamily: "'Cinzel', serif", fontSize: 40, fontWeight: 400, letterSpacing: 12, color: "#d4a84b", margin: 0 },
  logoSub: { fontSize: 12, letterSpacing: 4, color: "#706050", textTransform: "uppercase", margin: 0 },
  input: { width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(200,160,80,0.25)", borderRadius: 12, padding: "12px 16px", color: "#f0e8d8", fontFamily: "inherit", fontSize: 14, outline: "none", boxSizing: "border-box" },
  error: { color: "#d4a84b", fontSize: 13, margin: 0 },
  btn: { background: "rgba(200,160,80,0.15)", border: "1px solid rgba(200,160,80,0.4)", borderRadius: 20, padding: "10px 24px", color: "#d4a84b", fontFamily: "inherit", fontSize: 13, cursor: "pointer", letterSpacing: 1, transition: "all 0.3s" },
  btnRed: { background: "rgba(200,60,60,0.15)", border: "1px solid rgba(200,60,60,0.4)", color: "#e08080" },
  layout: { display: "flex", minHeight: "100vh" },
  nav: { width: 220, background: "rgba(0,0,0,0.6)", borderRight: "1px solid rgba(200,160,80,0.1)", display: "flex", flexDirection: "column", padding: "32px 0", gap: 4, flexShrink: 0 },
  navLogo: { display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 32, gap: 4 },
  navTitle: { fontFamily: "'Cinzel', serif", fontSize: 20, letterSpacing: 8, color: "#d4a84b" },
  navSub: { fontSize: 10, letterSpacing: 4, color: "#706050", textTransform: "uppercase" },
  navBtn: { background: "none", border: "none", color: "#a09080", fontFamily: "inherit", fontSize: 13, padding: "12px 24px", cursor: "pointer", textAlign: "left", transition: "all 0.2s", letterSpacing: 0.5 },
  navBtnActive: { color: "#d4a84b", background: "rgba(200,160,80,0.1)", borderRight: "2px solid #d4a84b" },
  navDivider: { height: 1, background: "rgba(200,160,80,0.1)", margin: "16px 20px" },
  navLink: { color: "#a09080", fontFamily: "'Palatino Linotype', serif", fontSize: 13, padding: "12px 24px", letterSpacing: 0.5, textDecoration: "none", transition: "all 0.2s", display: "block" },
  main: { flex: 1, padding: "40px 48px", overflowY: "auto" },
  section: { maxWidth: 900 },
  sectionTitle: { fontFamily: "'Cinzel', serif", fontSize: 22, fontWeight: 400, letterSpacing: 4, color: "#d4a84b", marginBottom: 24 },
  subTitle: { fontSize: 15, letterSpacing: 2, color: "#d4a84b", margin: "24px 0 12px" },
  statsGrid: { display: "flex", gap: 20, flexWrap: "wrap" },
  statCard: { background: "rgba(200,160,80,0.06)", border: "1px solid rgba(200,160,80,0.15)", borderRadius: 16, padding: "24px 32px", minWidth: 160, textAlign: "center" },
  statNum: { fontSize: 40, fontWeight: 400, color: "#d4a84b", fontFamily: "'Cinzel', serif" },
  statLabel: { fontSize: 12, color: "#a09080", letterSpacing: 1, marginTop: 8 },
  table: { background: "rgba(0,0,0,0.3)", border: "1px solid rgba(200,160,80,0.1)", borderRadius: 16, overflow: "hidden" },
  tableHeader: { display: "flex", padding: "12px 20px", borderBottom: "1px solid rgba(200,160,80,0.1)", fontSize: 11, color: "#706050", letterSpacing: 2, textTransform: "uppercase" },
  tableRow: { display: "flex", padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer", alignItems: "center", transition: "background 0.2s" },
  badge: { fontSize: 11, padding: "3px 10px", borderRadius: 20, letterSpacing: 0.5 },
  badgeFree: { background: "rgba(255,255,255,0.08)", color: "#a09080" },
  badgePremium: { background: "rgba(200,160,80,0.2)", color: "#d4a84b", border: "1px solid rgba(200,160,80,0.3)" },
  smallBtn: { background: "rgba(200,160,80,0.1)", border: "1px solid rgba(200,160,80,0.3)", borderRadius: 12, padding: "4px 10px", color: "#d4a84b", fontSize: 11, cursor: "pointer", fontFamily: "inherit" },
  smallBtnRed: { background: "rgba(200,60,60,0.1)", border: "1px solid rgba(200,60,60,0.3)", color: "#e08080" },
  backBtn: { background: "none", border: "none", color: "#a09080", cursor: "pointer", fontFamily: "inherit", fontSize: 13, marginBottom: 16, padding: 0, letterSpacing: 0.5 },
  userMeta: { color: "#a09080", fontSize: 14, marginBottom: 24 },
  empty: { color: "#706050", fontSize: 14, fontStyle: "italic" },
  convItem: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(200,160,80,0.1)", borderRadius: 12, padding: "14px 18px", marginBottom: 8, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "all 0.2s" },
  convTitle: { fontSize: 14, color: "#e8d8b8" },
  convDate: { fontSize: 12, color: "#706050" },
  summaryBox: { background: "rgba(200,160,80,0.06)", border: "1px solid rgba(200,160,80,0.2)", borderRadius: 16, padding: "20px 24px", marginBottom: 24 },
  summaryLabel: { fontSize: 11, letterSpacing: 3, color: "#d4a84b", marginBottom: 12, textTransform: "uppercase" },
  summaryText: { fontSize: 14, lineHeight: 1.8, color: "#c8bcac" },
  msgList: { display: "flex", flexDirection: "column", gap: 12 },
  msgItem: { borderRadius: 12, padding: "12px 16px" },
  msgUser: { background: "rgba(139,90,200,0.1)", border: "1px solid rgba(139,90,200,0.2)", alignSelf: "flex-end" },
  msgNova: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(200,160,80,0.15)" },
  msgRole: { fontSize: 10, letterSpacing: 2, color: "#d4a84b", textTransform: "uppercase", display: "block", marginBottom: 6 },
  msgContent: { fontSize: 13, lineHeight: 1.7, color: "#c8bcac", margin: 0 },
  directivesList: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 },
  directiveItem: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(200,160,80,0.1)", borderRadius: 10, padding: "12px 16px" },
  directiveText: { fontSize: 13, color: "#c8bcac", flex: 1 },
  removeBtn: { background: "none", border: "none", color: "#706050", cursor: "pointer", fontSize: 14, padding: "0 4px", transition: "color 0.2s" },
  addDirective: { display: "flex", gap: 12, alignItems: "center" },
  hint: { fontSize: 13, color: "#706050", marginBottom: 20 },
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { width: 100%; min-height: 100vh; }
  .table-row:hover { background: rgba(200,160,80,0.05) !important; }
  .conv-item-admin:hover { background: rgba(200,160,80,0.08) !important; border-color: rgba(200,160,80,0.3) !important; }
  a[href="/"]:hover { color: #d4a84b !important; }
  input::placeholder { color: rgba(160,140,120,0.5); }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(200,160,80,0.3); border-radius: 2px; }
`;
