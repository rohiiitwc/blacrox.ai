const HistoryUI = (() => {
  const historyTableBody = document.getElementById('historyTableBody');
  const historyEmptyMsg = document.getElementById('historyEmptyMsg');

  // Stats elements
  const statWinRate = document.getElementById('statWinRate');
  const statDecisiveCount = document.getElementById('statDecisiveCount');
  const statOtcWinRate = document.getElementById('statOtcWinRate');
  const statLiveWinRate = document.getElementById('statLiveWinRate');
  const statRefunds = document.getElementById('statRefunds');
  const statVerificationBanner = document.getElementById('statVerificationBanner');

  function getLocalKey() {
    const user = API.getUser();
    const uid = user && user.id ? user.id : 'default';
    return `blacrox_persistent_history_${uid}`;
  }

  function getLocalHistory() {
    try {
      const raw = localStorage.getItem(getLocalKey());
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveLocalHistory(list) {
    try {
      localStorage.setItem(getLocalKey(), JSON.stringify(list));
    } catch (e) {
      console.warn('localStorage save warning:', e);
    }
  }

  function saveLocalAnalysis(analysis, aiResults = []) {
    if (!analysis) return;
    const list = getLocalHistory();
    const numId = Number(analysis.id);
    const existingIndex = list.findIndex(item => Number(item.id) === numId);
    const record = {
      ...analysis,
      ai_results: aiResults && aiResults.length ? aiResults : (analysis.ai_results || [])
    };
    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...record };
    } else {
      list.unshift(record);
    }
    saveLocalHistory(list);
  }

  function updateLocalEvaluation(analysisId, evaluation) {
    if (!analysisId || !evaluation) return;
    const list = getLocalHistory();
    const target = list.find(item => Number(item.id) === Number(analysisId));
    if (target) {
      target.evaluation_result = evaluation.evaluation_result;
      target.candle_color = evaluation.candle_color;
      target.evaluated_at = evaluation.evaluated_at;
      target.evaluation_id = evaluation.id;
      saveLocalHistory(list);
    }
  }

  async function loadHistory() {
    try {
      // 1. Fetch server records
      let serverRows = [];
      try {
        const res = await API.getHistory();
        if (res && res.success && Array.isArray(res.history)) {
          serverRows = res.history;
        }
      } catch (netErr) {
        console.warn('Server history fetch warning:', netErr);
      }

      // 2. Read local persistent storage
      const localRows = getLocalHistory();

      // 3. Merge server and local records without duplicates (keyed by ID)
      const mergedMap = new Map();

      // Add local persistent records first
      for (const item of localRows) {
        if (item && item.id) {
          mergedMap.set(Number(item.id), item);
        }
      }

      // Merge and update with server records
      for (const item of serverRows) {
        if (item && item.id) {
          const numId = Number(item.id);
          const existing = mergedMap.get(numId);
          mergedMap.set(numId, existing ? { ...existing, ...item } : item);
        }
      }

      const mergedList = Array.from(mergedMap.values());
      // Sort descending (newest analysis first)
      mergedList.sort((a, b) => {
        const timeA = new Date(a.upload_timestamp || 0).getTime() || Number(a.id) || 0;
        const timeB = new Date(b.upload_timestamp || 0).getTime() || Number(b.id) || 0;
        return timeB - timeA;
      });

      // Keep local persistent storage updated with full merged list
      saveLocalHistory(mergedList);

      // Opportunistically sync local records to server if server was missing some
      if (API.syncAnalyses && localRows.length > serverRows.length) {
        API.syncAnalyses(localRows).catch(() => {});
      }

      if (mergedList.length === 0) {
        historyTableBody.innerHTML = '';
        historyEmptyMsg.style.display = 'block';
        return;
      }

      historyEmptyMsg.style.display = 'none';
      historyTableBody.innerHTML = mergedList.map(row => {
        const date = new Date(row.upload_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const isOtc = (row.market_type || '').toUpperCase().includes('OTC') || (row.trading_pair || '').toUpperCase().includes('OTC');
        
        let evalBadge = '<span class="badge-timeframe">Pending Evaluation</span>';
        if (row.evaluation_result === 'CORRECT') {
          evalBadge = '<span class="model-decision-tag tag-up">✓ CORRECT</span>';
        } else if (row.evaluation_result === 'INCORRECT') {
          evalBadge = '<span class="model-decision-tag tag-down">✗ INCORRECT</span>';
        } else if (row.evaluation_result === 'REFUND') {
          evalBadge = '<span class="model-decision-tag tag-inconclusive">🔄 REFUND</span>';
        }

        const decisionClass = row.consensus_decision === 'UP' ? 'tag-up' : row.consensus_decision === 'DOWN' ? 'tag-down' : 'tag-inconclusive';
        const entryTag = row.entry_time_ist ? `<div style="font-size: 0.72rem; color: #34d399; font-family: monospace;">Entry: ${row.entry_time_ist}</div>` : '';
        const screenshotSrc = row.image_data_url || (row.initial_screenshot ? `/uploads/${row.initial_screenshot}` : '');
        const screenshotThumb = screenshotSrc
          ? `<a href="${screenshotSrc}" target="_blank" onclick="event.stopPropagation();" title="Click to view full Quotex screenshot">
              <img src="${screenshotSrc}" alt="Chart Screenshot" style="width: 55px; height: 32px; object-fit: cover; border-radius: 4px; border: 1px solid var(--border-highlight); transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.8)'; this.style.zIndex='10';" onmouseout="this.style.transform='scale(1)'; this.style.zIndex='1';">
            </a>`
          : `<span style="font-size: 0.75rem; color: var(--text-muted);">Saved</span>`;

        return `
          <tr style="cursor: pointer;" onclick="HistoryUI.viewDetail(${row.id})">
            <td>${date}</td>
            <td style="text-align: center;">${screenshotThumb}</td>
            <td><strong>${row.trading_pair}</strong> <span class="${isOtc ? 'badge-otc' : 'badge-live'}">${isOtc ? 'OTC' : 'LIVE'}</span>${entryTag}</td>
            <td>${row.timeframe || '1M'}</td>
            <td><span class="model-decision-tag ${decisionClass}">${row.consensus_decision}</span></td>
            <td>${row.agreement_score || '3/3'} (${row.agreement_type || 'UNANIMOUS'})</td>
            <td>${evalBadge}</td>
            <td style="white-space: nowrap;">
              <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;" onclick="HistoryUI.viewDetail(${row.id})">View</button>
              <button class="btn btn-danger" style="padding: 4px 8px; font-size: 0.75rem; margin-left: 4px; background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.4); color: #f87171;" onclick="HistoryUI.deleteSingle(${row.id}, event)" title="Delete this record">🗑️</button>
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  }

  async function loadStats() {
    try {
      const res = await API.getStats();
      if (!res.success || !res.stats) return;

      const { overall, otc, live } = res.stats;

      statWinRate.textContent = overall.decisiveTotal > 0 ? `${overall.winRate}%` : '0.0%';
      statDecisiveCount.textContent = `${overall.correct}W / ${overall.incorrect}L (Total ${overall.total})`;
      statOtcWinRate.textContent = otc.decisiveTotal > 0 ? `${otc.winRate}% (${otc.correct}W/${otc.incorrect}L)` : '0.0% (0W/0L)';
      statLiveWinRate.textContent = live.decisiveTotal > 0 ? `${live.winRate}% (${live.correct}W/${live.incorrect}L)` : '0.0% (0W/0L)';
      statRefunds.textContent = `${overall.refund} Neutral`;

      if (statVerificationBanner) {
        if (overall.decisiveTotal === 0) {
          statVerificationBanner.className = 'alert-banner alert-warning';
          statVerificationBanner.innerHTML = `⚠️ <strong>Sample Size Notice:</strong> No evaluated trades on record yet. Accuracy is currently <strong>UNVERIFIED</strong> (0/20 minimum resolved samples required for statistical significance).`;
        } else if (!overall.isVerified) {
          statVerificationBanner.className = 'alert-banner alert-warning';
          statVerificationBanner.innerHTML = `⚠️ <strong>Sample Size Notice:</strong> Accuracy is currently <strong>UNVERIFIED</strong> (${overall.decisiveTotal}/20 minimum resolved samples required for statistical significance).`;
        } else {
          statVerificationBanner.className = 'alert-banner';
          statVerificationBanner.innerHTML = `✓ <strong>Statistically Meaningful Sample:</strong> ${overall.decisiveTotal} evaluated candles on record.`;
        }
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }

  async function viewDetail(analysisId) {
    try {
      let analysis = null;
      let aiResults = [];
      let evaluation = null;

      try {
        const res = await API.getAnalysis(analysisId);
        if (res && res.success && res.analysis) {
          analysis = res.analysis;
          aiResults = res.ai_results || [];
          evaluation = res.evaluation;
        }
      } catch (e) {
        console.warn('Server lookup fallback:', e.message);
      }

      // Fallback to local persistent storage if server container refreshed
      if (!analysis) {
        const localList = getLocalHistory();
        analysis = localList.find(item => Number(item.id) === Number(analysisId));
        if (analysis) {
          aiResults = analysis.ai_results || [];
          if (analysis.evaluation_result) {
            evaluation = {
              analysis_id: analysis.id,
              evaluation_result: analysis.evaluation_result,
              candle_color: analysis.candle_color
            };
          }
        }
      }

      if (analysis) {
        // Switch to Dashboard tab
        document.getElementById('navDashboard').click();

        // Display stored screenshot in preview container if available
        if (analysis.image_data_url || analysis.initial_screenshot) {
          const previewImage = document.getElementById('previewImage');
          const previewContainer = document.getElementById('previewContainer');
          const previewFilename = document.getElementById('previewFilename');
          const dropzone = document.getElementById('dropzone');
          if (previewImage) previewImage.src = analysis.image_data_url || `/uploads/${analysis.initial_screenshot}`;
          if (previewFilename) previewFilename.textContent = analysis.initial_screenshot_orig_name || 'Stored Quotex Screenshot';
          if (previewContainer) previewContainer.style.display = 'block';
          if (dropzone) dropzone.style.display = 'none';
        }

        DashboardUI.renderAnalysis(analysis, aiResults);
        if (evaluation) {
          EvaluationUI.renderEvaluationResult(evaluation);
        }
      } else {
        alert('Could not find analysis details for this record.');
      }
    } catch (err) {
      alert(`Could not load analysis details: ${err.message}`);
    }
  }

  async function clearAllHistory() {
    if (!confirm('Are you sure you want to delete all your chart analysis history? This action cannot be undone.')) {
      return;
    }

    try {
      try { await API.clearHistory(); } catch (e) {}
      saveLocalHistory([]);
      await loadHistory();
      await loadStats();
      alert('All analysis history has been deleted.');
    } catch (err) {
      alert(`Error deleting history: ${err.message}`);
    }
  }

  async function deleteSingle(analysisId, event) {
    if (event) event.stopPropagation();
    if (!confirm('Delete this chart analysis record?')) {
      return;
    }

    try {
      try { await API.deleteAnalysis(analysisId); } catch (e) {}
      const localList = getLocalHistory().filter(item => Number(item.id) !== Number(analysisId));
      saveLocalHistory(localList);
      await loadHistory();
      await loadStats();
    } catch (err) {
      alert(`Error deleting record: ${err.message}`);
    }
  }

  function init() {
    window.addEventListener('evaluation-recorded', () => {
      loadHistory();
      loadStats();
    });

    window.addEventListener('user-logged-in', () => {
      loadHistory();
      loadStats();
    });
  }

  return {
    init,
    loadHistory,
    loadStats,
    viewDetail,
    clearAllHistory,
    deleteSingle,
    saveLocalAnalysis,
    updateLocalEvaluation
  };
})();

window.HistoryUI = HistoryUI;
