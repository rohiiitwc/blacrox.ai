const EvaluationUI = (() => {
  let activeAnalysisId = null;
  let activeOriginalDecision = null;
  let selectedCandleColor = null;
  let selectedResultScreenshot = null;

  const evalSection = document.getElementById('evaluationSection');
  const evalOutcomeButtons = document.querySelectorAll('.btn-outcome');
  const resultScreenshotInput = document.getElementById('resultScreenshotInput');
  const btnSubmitEval = document.getElementById('btnSubmitEval');
  const evalResultBanner = document.getElementById('evalResultBanner');
  const evalResultTitle = document.getElementById('evalResultTitle');
  const evalResultNotes = document.getElementById('evalResultNotes');

  function setSelectedColor(color) {
    selectedCandleColor = color;
    evalOutcomeButtons.forEach(btn => {
      if (btn.dataset.color === color) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
    });
    btnSubmitEval.disabled = !selectedCandleColor;
  }

  function renderEvaluationResult(evalData) {
    evalResultBanner.style.display = 'block';
    const res = evalData.evaluation_result;

    const btnRefreshAiAfterLoss = document.getElementById('btnRefreshAiAfterLoss');

    if (res === 'CORRECT') {
      evalResultBanner.className = 'evaluation-result-banner eval-correct';
      evalResultTitle.textContent = '🎉 SIMULATED OUTCOME: CORRECT';
      if (btnRefreshAiAfterLoss) {
        btnRefreshAiAfterLoss.style.display = 'inline-flex';
        btnRefreshAiAfterLoss.textContent = '🔄 Refresh AI & Analyze Next Chart';
        btnRefreshAiAfterLoss.style.background = 'rgba(59, 130, 246, 0.2)';
        btnRefreshAiAfterLoss.style.color = '#60a5fa';
        btnRefreshAiAfterLoss.style.border = '1px solid rgba(59, 130, 246, 0.4)';
      }
    } else if (res === 'INCORRECT') {
      evalResultBanner.className = 'evaluation-result-banner eval-incorrect';
      evalResultTitle.textContent = '❌ SIMULATED OUTCOME: INCORRECT';
      if (btnRefreshAiAfterLoss) {
        btnRefreshAiAfterLoss.style.display = 'inline-flex';
        btnRefreshAiAfterLoss.textContent = '🔄 Refresh AI & Start Fresh (Recalibrate for Next Trade)';
        btnRefreshAiAfterLoss.style.background = '#f59e0b';
        btnRefreshAiAfterLoss.style.color = '#000';
        btnRefreshAiAfterLoss.style.border = 'none';
      }
    } else if (res === 'REFUND') {
      evalResultBanner.className = 'evaluation-result-banner eval-refund';
      evalResultTitle.textContent = '🔄 SIMULATED OUTCOME: DOJI / REFUND (Neutral)';
      if (btnRefreshAiAfterLoss) {
        btnRefreshAiAfterLoss.style.display = 'inline-flex';
        btnRefreshAiAfterLoss.textContent = '🔄 Refresh AI & Try Next Trade';
        btnRefreshAiAfterLoss.style.background = 'rgba(59, 130, 246, 0.2)';
        btnRefreshAiAfterLoss.style.color = '#60a5fa';
        btnRefreshAiAfterLoss.style.border = '1px solid rgba(59, 130, 246, 0.4)';
      }
    } else {
      evalResultBanner.className = 'evaluation-result-banner';
      evalResultTitle.textContent = '⚠️ SIMULATED OUTCOME: UNRESOLVED';
      if (btnRefreshAiAfterLoss) {
        btnRefreshAiAfterLoss.style.display = 'inline-flex';
        btnRefreshAiAfterLoss.textContent = '🔄 Refresh AI & Reset';
        btnRefreshAiAfterLoss.style.background = 'rgba(255, 255, 255, 0.1)';
        btnRefreshAiAfterLoss.style.color = '#e2e8f0';
        btnRefreshAiAfterLoss.style.border = '1px solid rgba(255, 255, 255, 0.2)';
      }
    }

    evalResultNotes.textContent = evalData.evaluation_notes || 'Evaluation registered.';
    btnSubmitEval.disabled = true;
    btnSubmitEval.textContent = 'Evaluated';

    // Auto-delete / clear preview screenshot and stop countdown on trade completion
    if (window.DashboardUI) {
      DashboardUI.stopTradeExpiryCountdown();
      DashboardUI.resetUpload();
    }

    // Broadcast stats refresh
    window.dispatchEvent(new CustomEvent('evaluation-recorded'));
  }

  function init() {
    window.addEventListener('analysis-loaded', (e) => {
      const { analysis } = e.detail;
      activeAnalysisId = analysis.id;
      activeOriginalDecision = analysis.consensus_decision;
      evalSection.style.display = 'block';
      evalResultBanner.style.display = 'none';
      selectedCandleColor = null;
      evalOutcomeButtons.forEach(b => b.classList.remove('selected'));
      btnSubmitEval.disabled = true;
      btnSubmitEval.textContent = 'Record Candle Outcome & Evaluate';
    });

    evalOutcomeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        setSelectedColor(btn.dataset.color);
      });
    });

    if (resultScreenshotInput) {
      resultScreenshotInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          selectedResultScreenshot = e.target.files[0];
          document.getElementById('resultScreenshotLabel').textContent = `Attached: ${selectedResultScreenshot.name}`;
        }
      });
    }

    btnSubmitEval.addEventListener('click', async () => {
      if (!activeAnalysisId || !selectedCandleColor) return;

      btnSubmitEval.disabled = true;
      btnSubmitEval.textContent = 'Evaluating...';

      const formData = new FormData();
      formData.append('analysis_id', activeAnalysisId);
      formData.append('candle_color', selectedCandleColor);
      if (activeOriginalDecision) {
        formData.append('original_decision', activeOriginalDecision);
      }
      const pairElem = document.getElementById('resultPair');
      if (pairElem && pairElem.textContent) {
        formData.append('trading_pair', pairElem.textContent.trim());
      }
      if (selectedResultScreenshot) {
        formData.append('completed_screenshot', selectedResultScreenshot);
      }

      try {
        const res = await API.submitEvaluation(formData);
        if (res.success && res.evaluation) {
          const evalAnalysisId = (res.evaluation && res.evaluation.analysis_id) || activeAnalysisId;
          if (window.HistoryUI && HistoryUI.updateLocalEvaluation) {
            HistoryUI.updateLocalEvaluation(evalAnalysisId, res.evaluation);
          }
          renderEvaluationResult(res.evaluation);
        }
      } catch (err) {
        btnSubmitEval.disabled = false;
        btnSubmitEval.textContent = 'Record Candle Outcome & Evaluate';
        alert(`Evaluation error: ${err.message}`);
      }
    });
  }

  return {
    init,
    renderEvaluationResult
  };
})();

window.EvaluationUI = EvaluationUI;

