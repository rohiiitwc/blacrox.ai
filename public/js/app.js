document.addEventListener('DOMContentLoaded', () => {
  // Navigation Tabs
  const navDashboard = document.getElementById('navDashboard');
  const navHistory = document.getElementById('navHistory');
  const navStats = document.getElementById('navStats');
  const navSystem = document.getElementById('navSystem');

  const viewDashboard = document.getElementById('viewDashboard');
  const viewHistory = document.getElementById('viewHistory');
  const viewStats = document.getElementById('viewStats');
  const viewSystem = document.getElementById('viewSystem');

  const clockEl = document.getElementById('syncClock');
  const sessionTimerEl = document.getElementById('sessionTimer');
  const userNameEl = document.getElementById('userName');
  const userAvatarEl = document.getElementById('userAvatar');
  const btnLogout = document.getElementById('btnLogout');

  function switchTab(activeTab, activeView) {
    [navDashboard, navHistory, navStats, navSystem].forEach(t => t.classList.remove('active'));
    [viewDashboard, viewHistory, viewStats, viewSystem].forEach(v => v.style.display = 'none');

    activeTab.classList.add('active');
    activeView.style.display = 'block';

    if (activeTab === navHistory) HistoryUI.loadHistory();
    if (activeTab === navStats) HistoryUI.loadStats();
    if (activeTab === navSystem) loadSystemInfo();
  }

  navDashboard.addEventListener('click', () => switchTab(navDashboard, viewDashboard));
  navHistory.addEventListener('click', () => switchTab(navHistory, viewHistory));
  navStats.addEventListener('click', () => switchTab(navStats, viewStats));
  navSystem.addEventListener('click', () => switchTab(navSystem, viewSystem));

  // User Profile
  function updateProfileUI() {
    const user = API.getUser();
    if (user) {
      userNameEl.textContent = user.full_name || user.email;
      const initials = (user.full_name || user.email).charAt(0).toUpperCase();
      userAvatarEl.textContent = initials;
      document.getElementById('userProfileBox').style.display = 'flex';
    } else {
      document.getElementById('userProfileBox').style.display = 'none';
    }
  }

  btnLogout.addEventListener('click', () => {
    API.clearSession();
    updateProfileUI();
    AuthUI.openModal('You have been logged out.');
  });

  // Clock Synchronization (UTC & Server time)
  function startSyncClock() {
    setInterval(() => {
      const now = new Date();
      const utcTime = now.toUTCString().split(' ')[4]; // HH:MM:SS
      if (clockEl) {
        clockEl.textContent = `${utcTime} UTC`;
      }

      // Check session expiry countdown (120 minutes)
      const expiry = API.getExpiry();
      if (expiry) {
        const remainingMs = expiry - Date.now();
        if (remainingMs <= 0) {
          API.handleSessionExpiry('Your session has expired. Please log in again.');
        } else {
          const totalSeconds = Math.floor(remainingMs / 1000);
          const hours = Math.floor(totalSeconds / 3600);
          const minutes = Math.floor((totalSeconds % 3600) / 60);
          const seconds = totalSeconds % 60;
          if (sessionTimerEl) {
            sessionTimerEl.textContent = `⏱️ ${hours}h ${minutes}m ${seconds}s`;
          }
        }
      }
    }, 1000);
  }

  // System status loader
  async function loadSystemInfo() {
    try {
      const res = await API.getSystemStatus();
      if (!res.success) return;

      document.getElementById('sysOpenAiStatus').textContent = res.providers.chatgpt.isConfigured ? 'Live Key Active' : 'Simulation Mode (Key not set in .env)';
      document.getElementById('sysGeminiStatus').textContent = res.providers.gemini.isConfigured ? 'Live Key Active' : 'Simulation Mode (Key not set in .env)';
      document.getElementById('sysGrokStatus').textContent = res.providers.grok.isConfigured ? 'Live Key Active' : 'Simulation Mode (Key not set in .env)';
      document.getElementById('sysUptime').textContent = `${res.uptimeSeconds} seconds`;
      document.getElementById('sysServerTime').textContent = res.serverTime;
    } catch (err) {
      console.error('Failed to load system info:', err);
    }
  }

  // Initialize Modules
  AuthUI.init();
  DashboardUI.init();
  EvaluationUI.init();
  HistoryUI.init();
  startSyncClock();

  // Check initial login state
  const token = API.getToken();
  if (!token) {
    AuthUI.openModal();
  } else {
    updateProfileUI();
    HistoryUI.loadStats();
  }

  window.addEventListener('user-logged-in', () => {
    updateProfileUI();
    HistoryUI.loadHistory();
    HistoryUI.loadStats();
  });
});

