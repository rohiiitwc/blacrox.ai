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

  async function loadHistory() {
    try {
      const res = await API.getHistory();
      if (!res.success || !res.history || res.history.length === 0) {
        historyTableBody.innerHTML = '';
        historyEmptyMsg.style.display = 'block';
        return;
      }

      historyEmptyMsg.style.display = 'none';
      historyTableBody.innerHTML = res.history.map(row => {
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
        const screenshotThumb = row.initial_screenshot
          ? `<a href="/uploads/${row.initial_screenshot}" target="_blank" onclick="event.stopPropagation();" title="Click to view full Quotex screenshot">
              <img src="/uploads/${row.initial_screenshot}" alt="Chart Screenshot" style="width: 55px; height: 32px; object-fit: cover; border-radius: 4px; border: 1px solid var(--border-highlight); transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.8)'; this.style.zIndex='10';" onmouseout="this.style.transform='scale(1)'; this.style.zIndex='1';">
            </a>`
          : `<span style="font-size: 0.75rem; color: var(--text-muted);">None</span>`;

        return `
          <tr style="cursor: pointer;" onclick="HistoryUI.viewDetail(${row.id})">
            <td>${date}</td>
            <td style="text-align: center;">${screenshotThumb}</td>
            <td><strong>${row.trading_pair}</strong> <span class="${isOtc ? 'badge-otc' : 'badge-live'}">${isOtc ? 'OTC' : 'LIVE'}</span>${entryTag}</td>
            <td>${row.timeframe || '1M'}</td>
            <td><span class="model-decision-tag ${decisionClass}">${row.consensus_decision}</span></td>
            <td>${row.agreement_score} (${row.agreement_type})</td>
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

      statWinRate.textContent = `${overall.winRate}%`;
      statDecisiveCount.textContent = `${overall.correct}W / ${overall.incorrect}L (Total ${overall.total})`;
      statOtcWinRate.textContent = `${otc.winRate}% (${otc.correct}W/${otc.incorrect}L)`;
      statLiveWinRate.textContent = `${live.winRate}% (${live.correct}W/${live.incorrect}L)`;
      statRefunds.textContent = `${overall.refund} Neutral`;

      if (statVerificationBanner) {
        if (!overall.isVerified) {
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
      const res = await API.getAnalysis(analysisId);
      if (res.success && res.analysis) {
        // Switch to Dashboard tab
        document.getElementById('navDashboard').click();

        // Display stored screenshot in preview container
        if (res.analysis.initial_screenshot) {
          const previewImage = document.getElementById('previewImage');
          const previewContainer = document.getElementById('previewContainer');
          const previewFilename = document.getElementById('previewFilename');
          const dropzone = document.getElementById('dropzone');
          if (previewImage) previewImage.src = `/uploads/${res.analysis.initial_screenshot}`;
          if (previewFilename) previewFilename.textContent = res.analysis.initial_screenshot_orig_name || 'Stored Quotex Screenshot';
          if (previewContainer) previewContainer.style.display = 'block';
          if (dropzone) dropzone.style.display = 'none';
        }

        DashboardUI.renderAnalysis(res.analysis, res.ai_results || []);
        if (res.evaluation) {
          EvaluationUI.renderEvaluationResult(res.evaluation);
        }
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
      const res = await API.clearHistory();
      if (res.success) {
        await loadHistory();
        await loadStats();
        alert('All analysis history has been deleted.');
      } else {
        alert(res.message || 'Failed to delete history.');
      }
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
      const res = await API.deleteAnalysis(analysisId);
      if (res.success) {
        await loadHistory();
        await loadStats();
      } else {
        alert(res.message || 'Failed to delete record.');
      }
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
    deleteSingle
  };
})();

window.HistoryUI = HistoryUI;

