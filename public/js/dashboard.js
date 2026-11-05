const DashboardUI = (() => {
  let selectedFile = null;
  let currentAnalysis = null;

  // DOM Elements
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const previewContainer = document.getElementById('previewContainer');
  const previewImage = document.getElementById('previewImage');
  const previewFilename = document.getElementById('previewFilename');
  const btnRemoveImage = document.getElementById('btnRemoveImage');
  const btnStartAnalysis = document.getElementById('btnStartAnalysis');

  const processingDeck = document.getElementById('processingDeck');
  const resultView = document.getElementById('resultView');

  // Result Elements
  const resultPair = document.getElementById('resultPair');
  const resultMarketBadge = document.getElementById('resultMarketBadge');
  const resultTimeframe = document.getElementById('resultTimeframe');
  const resultDecisionBig = document.getElementById('resultDecisionBig');
  const resultAgreementPill = document.getElementById('resultAgreementPill');
  const resultConfidenceText = document.getElementById('resultConfidenceText');
  const resultConfidenceBar = document.getElementById('resultConfidenceBar');
  const resultConclusion = document.getElementById('resultConclusion');
  const heroCard = document.getElementById('consensusHeroCard');

  // Individual AI Model Cards
  const chatgptDecisionTag = document.getElementById('chatgptDecisionTag');
  const chatgptConfidence = document.getElementById('chatgptConfidence');
  const chatgptSummary = document.getElementById('chatgptSummary');

  const geminiDecisionTag = document.getElementById('geminiDecisionTag');
  const geminiConfidence = document.getElementById('geminiConfidence');
  const geminiSummary = document.getElementById('geminiSummary');

  const grokDecisionTag = document.getElementById('grokDecisionTag');
  const grokConfidence = document.getElementById('grokConfidence');
  const grokSummary = document.getElementById('grokSummary');

  // Deep Technical Indicators
  const detailCandlestick = document.getElementById('detailCandlestick');
  const detailEma = document.getElementById('detailEma');
  const detailBb = document.getElementById('detailBb');
  const detailSr = document.getElementById('detailSr');
  const detailVolume = document.getElementById('detailVolume');
  const detailStructure = document.getElementById('detailStructure');
  const detailScenarios = document.getElementById('detailScenarios');
  const detailUncertainty = document.getElementById('detailUncertainty');

  // Accordion Toggle
  const btnToggleTechnical = document.getElementById('btnToggleTechnical');
  const technicalContent = document.getElementById('technicalContent');

  function handleFileSelected(file) {
    if (!file) return;

    const allowed = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowed.includes(file.type)) {
      alert('Unsupported file format. Please upload a PNG, JPG, or JPEG Quotex chart image.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Image size exceeds 10MB limit. Please upload a smaller screenshot.');
      return;
    }

    selectedFile = file;
    previewFilename.textContent = file.name;

    const reader = new FileReader();
    reader.onload = (e) => {
      previewImage.src = e.target.result;
      previewContainer.style.display = 'block';
      dropzone.style.display = 'none';
      btnStartAnalysis.disabled = false;
    };
    reader.readAsDataURL(file);
  }

  function resetUpload() {
    selectedFile = null;
    fileInput.value = '';
    previewImage.src = '';
    previewContainer.style.display = 'none';
    dropzone.style.display = 'block';
    btnStartAnalysis.disabled = true;
  }

  function setAiDeckProcessing(isProcessing) {
    if (isProcessing) {
      processingDeck.style.display = 'grid';
      resultView.style.display = 'none';
      document.querySelectorAll('.ai-engine-status-card').forEach(c => c.classList.add('processing'));
      document.getElementById('statusChatgpt').textContent = 'Analyzing chart...';
      document.getElementById('statusGemini').textContent = 'Analyzing chart...';
      document.getElementById('statusGrok').textContent = 'Analyzing chart...';
    } else {
      document.querySelectorAll('.ai-engine-status-card').forEach(c => c.classList.remove('processing'));
    }
  }

  function renderAnalysis(analysis, aiResults) {
    currentAnalysis = analysis;
    setAiDeckProcessing(false);
    resultView.style.display = 'block';

    // Pair and Market info
    resultPair.textContent = analysis.trading_pair || 'EUR/USD';
    const isOtc = (analysis.market_type || '').toUpperCase().includes('OTC') || (analysis.trading_pair || '').toUpperCase().includes('OTC');
    resultMarketBadge.textContent = isOtc ? 'OTC MARKET' : 'LIVE MARKET';
    resultMarketBadge.className = isOtc ? 'badge-otc' : 'badge-live';
    resultTimeframe.textContent = analysis.timeframe || '1M';

    // Decision styling
    const decision = analysis.consensus_decision || 'INCONCLUSIVE';
    resultDecisionBig.textContent = decision === 'UP' ? '▲ UP' : decision === 'DOWN' ? '▼ DOWN' : '● INCONCLUSIVE';
    resultDecisionBig.className = `decision-action-big text-${decision.toLowerCase()}`;

    // Hero border glow
    heroCard.className = `consensus-hero-card signal-${decision.toLowerCase()}`;

    // Agreement Pill
    const agreementScore = analysis.agreement_score || '0/3';
    const agreementType = analysis.agreement_type || 'DISAGREEMENT';
    resultAgreementPill.textContent = `${agreementScore} Model Agreement (${agreementType})`;
    resultAgreementPill.className = `agreement-pill ${agreementType.toLowerCase()}`;

    // Confidence
    const confidence = analysis.consensus_confidence || 50;
    resultConfidenceText.textContent = `${confidence}%`;
    resultConfidenceBar.style.width = `${confidence}%`;

    // Combined Conclusion
    resultConclusion.textContent = analysis.combined_conclusion || 'Simulated market analysis complete.';

    // Populate individual AI cards
    const chatgpt = aiResults.find(r => r.provider === 'chatgpt') || {};
    const gemini = aiResults.find(r => r.provider === 'gemini') || {};
    const grok = aiResults.find(r => r.provider === 'grok') || {};

    // ChatGPT
    chatgptDecisionTag.textContent = chatgpt.decision || 'N/A';
    chatgptDecisionTag.className = `model-decision-tag tag-${(chatgpt.decision || 'inconclusive').toLowerCase()}`;
    chatgptConfidence.textContent = `${chatgpt.confidence || 0}%`;
    chatgptSummary.textContent = chatgpt.candlestick_pattern || chatgpt.error_message || 'Analysis complete.';

    // Gemini
    geminiDecisionTag.textContent = gemini.decision || 'N/A';
    geminiDecisionTag.className = `model-decision-tag tag-${(gemini.decision || 'inconclusive').toLowerCase()}`;
    geminiConfidence.textContent = `${gemini.confidence || 0}%`;
    geminiSummary.textContent = gemini.candlestick_pattern || gemini.error_message || 'Analysis complete.';

    // Grok
    grokDecisionTag.textContent = grok.decision || 'N/A';
    grokDecisionTag.className = `model-decision-tag tag-${(grok.decision || 'inconclusive').toLowerCase()}`;
    grokConfidence.textContent = `${grok.confidence || 0}%`;
    grokSummary.textContent = grok.candlestick_pattern || grok.error_message || 'Analysis complete.';

    // Deep Technical Details (take most detailed from results)
    const primaryAi = aiResults.find(r => r.candlestick_pattern && r.candlestick_pattern !== 'N/A') || chatgpt;
    detailCandlestick.textContent = primaryAi.candlestick_pattern || 'Standard candles';
    detailEma.textContent = primaryAi.ema_observations || 'Not visible on chart';
    detailBb.textContent = primaryAi.bb_observations || 'Not visible on chart';
    detailSr.textContent = primaryAi.sr_observations || 'No clear horizontal levels';
    detailVolume.textContent = primaryAi.volume_observations || 'Volume not displayed';
    detailStructure.textContent = primaryAi.market_structure || 'Consolidation / Range';
    detailScenarios.textContent = primaryAi.scenarios || 'Bullish & bearish scenarios both present';
    detailUncertainty.textContent = primaryAi.uncertainty || 'Normal chart noise';

    // Broadcast analysis loaded event for Evaluation UI
    window.dispatchEvent(new CustomEvent('analysis-loaded', { detail: { analysis, aiResults } }));

    // Scroll smoothly to results
    resultView.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function init() {
    // Dropzone Events
    dropzone.addEventListener('click', () => fileInput.click());

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        handleFileSelected(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleFileSelected(e.target.files[0]);
      }
    });

    btnRemoveImage.addEventListener('click', resetUpload);

    // Toggle Technical Details Accordion
    btnToggleTechnical.addEventListener('click', () => {
      technicalContent.classList.toggle('open');
      const arrow = btnToggleTechnical.querySelector('.accordion-arrow');
      if (arrow) {
        arrow.textContent = technicalContent.classList.contains('open') ? '▲' : '▼';
      }
    });

    // Start Analysis
    btnStartAnalysis.addEventListener('click', async () => {
      if (!selectedFile) return;

      btnStartAnalysis.disabled = true;
      btnStartAnalysis.textContent = 'Processing Multi-AI Analysis...';
      setAiDeckProcessing(true);

      const formData = new FormData();
      formData.append('screenshot', selectedFile);

      try {
        const res = await API.uploadScreenshot(formData);
        btnStartAnalysis.disabled = false;
        btnStartAnalysis.textContent = '⚡ Run Multi-AI Analysis (ChatGPT + Gemini + Grok)';

        if (res.success && res.analysis) {
          renderAnalysis(res.analysis, res.ai_results || []);
        }
      } catch (err) {
        btnStartAnalysis.disabled = false;
        btnStartAnalysis.textContent = '⚡ Run Multi-AI Analysis (ChatGPT + Gemini + Grok)';
        setAiDeckProcessing(false);
        alert(`Analysis Error: ${err.message}`);
      }
    });
  }

  return {
    init,
    renderAnalysis,
    resetUpload,
    getCurrentAnalysis: () => currentAnalysis
  };
})();

window.DashboardUI = DashboardUI;

