// ============================================
// POPUP.JS TEMPLATE
// Features: markdown rendering, progressive loading,
// session cache, settings panel, re-analyze
// Only modify: ACTION LOGIC between ▼▼▼ and ▲▲▲
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const actionBtn = document.getElementById('action-btn');
  const retryBtn = document.getElementById('retry-btn');
  const copyBtn = document.getElementById('copy-btn');
  const rerunBtn = document.getElementById('rerun-btn');
  const mainContent = document.getElementById('main-content');
  const loading = document.getElementById('loading');
  const result = document.getElementById('result');
  const resultContent = document.getElementById('result-content');
  const error = document.getElementById('error');
  const errorMessage = document.getElementById('error-message');

  const settingsBtn = document.getElementById('settings-btn');
  const settingsPanel = document.getElementById('settings-panel');
  const settingsClose = document.getElementById('settings-close');
  const geminiKeyInput = document.getElementById('gemini-key-input');
  const openrouterKeyInput = document.getElementById('openrouter-key-input');
  const saveKeysBtn = document.getElementById('save-keys-btn');
  const clearKeysBtn = document.getElementById('clear-keys-btn');
  const toggleGeminiKey = document.getElementById('toggle-gemini-key');
  const toggleOpenrouterKey = document.getElementById('toggle-openrouter-key');

  const onboarding = document.getElementById('onboarding');
  const onboardGeminiInput = document.getElementById('onboard-gemini-input');
  const onboardOpenrouterInput = document.getElementById('onboard-openrouter-input');
  const onboardSaveBtn = document.getElementById('onboard-save-btn');

  // ---- Domain detection & local stats (pure, no API) ----

  function detectDomain(headers) {
    const h = headers.join(' ').toLowerCase();
    if (/revenue|deal|pipeline|quota|forecast|churn|sales|customer|mrr|arr/.test(h)) return { label: '📈 Sales', key: 'sales' };
    if (/employee|salary|department|headcount|tenure|performance|hire|payroll/.test(h)) return { label: '👥 HR', key: 'hr' };
    if (/budget|expense|cost|profit|margin|ebitda|invoice|payment|cashflow/.test(h)) return { label: '💰 Finance', key: 'finance' };
    if (/stock|sku|quantity|warehouse|reorder|inventory|supplier|units/.test(h)) return { label: '📦 Inventory', key: 'inventory' };
    if (/impression|click|ctr|conversion|cpc|cpa|campaign|ad spend|roas/.test(h)) return { label: '📣 Marketing', key: 'marketing' };
    return { label: '📊 Data', key: 'generic' };
  }

  function formatNum(n) {
    if (Math.abs(n) >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (Math.abs(n) >= 1000) return (n / 1000).toFixed(1) + 'K';
    return Number.isInteger(n) ? n.toString() : n.toFixed(2);
  }

  function computeStats(rows, headers) {
    const stats = [];
    headers.forEach((header, colIdx) => {
      const vals = rows.slice(1)
        .map(r => parseFloat((r[colIdx] || '').toString().replace(/[^0-9.\-]/g, '')))
        .filter(v => !isNaN(v) && isFinite(v));
      if (vals.length >= Math.max(2, rows.length * 0.4)) {
        const sum = vals.reduce((a, b) => a + b, 0);
        stats.push({ name: header, min: Math.min(...vals), max: Math.max(...vals), avg: sum / vals.length, sum, count: vals.length });
      }
    });
    return stats.slice(0, 3);
  }

  // ---- Markdown → HTML ----

  function renderMarkdown(text) {
    let html = text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/^### (.+)$/gm, '<h4>$1</h4>')
      .replace(/^## (.+)$/gm, '<h3>$1</h3>')
      .replace(/^# (.+)$/gm, '<h2>$1</h2>')
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/^---$/gm, '<hr>');

    html = html.replace(/((?:^\|.+\|$\n?)+)/gm, (tableBlock) => {
      const rows = tableBlock.trim().split('\n').filter(r => r.trim());
      if (rows.length < 2 || !/^\|[\s\-:]+\|/.test(rows[1])) return tableBlock;
      const parseRow = (row) => row.split('|').slice(1, -1).map(c => c.trim());
      const headers = parseRow(rows[0]);
      let table = '<table><thead><tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr></thead><tbody>';
      rows.slice(2).forEach(row => {
        const cells = parseRow(row);
        table += '<tr>' + cells.map(c => `<td>${c.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</td>`).join('') + '</tr>';
      });
      return table + '</tbody></table>';
    });

    html = html.replace(/((?:^- .+$\n?)+)/gm, (block) => {
      return '<ul>' + block.trim().split('\n').map(l => `<li>${l.replace(/^- /, '').trim()}</li>`).join('') + '</ul>';
    });

    html = html.replace(/((?:^\d+\. .+$\n?)+)/gm, (block) => {
      return '<ol>' + block.trim().split('\n').map(l => `<li>${l.replace(/^\d+\. /, '').trim()}</li>`).join('') + '</ol>';
    });

    html = html.split(/\n{2,}/).map(chunk => {
      const t = chunk.trim();
      if (!t) return '';
      if (/^<(h[2-4]|ul|ol|table|hr)/.test(t)) return t;
      return `<p>${t.replace(/\n/g, '<br>')}</p>`;
    }).join('');

    return html;
  }

  // ---- UI State Machine ----

  function showState(state) {
    mainContent.classList.toggle('hidden', state !== 'idle');
    loading.classList.toggle('hidden', state !== 'loading');
    result.classList.toggle('hidden', state !== 'result');
    error.classList.toggle('hidden', state !== 'error');
    if (state === 'result') result.classList.add('fade-in');
  }

  function showResult(text, isProgressive = false) {
    const badge = isProgressive ? '<span class="progressive-badge">⏳ Building your formula...</span>' : '';
    resultContent.innerHTML = badge + renderMarkdown(text);
    showState('result');
    if (!isProgressive) {
      chrome.storage.session.set({ cached_result: text, cached_at: Date.now() });
    }
  }

  function showError(msg) {
    errorMessage.textContent = msg;
    showState('error');
  }

  // ---- First-run onboarding ----

  function showOnboarding() {
    onboarding.classList.remove('hidden');
    mainContent.classList.add('hidden');
    loading.classList.add('hidden');
    result.classList.add('hidden');
    error.classList.add('hidden');
  }

  function hideOnboarding() {
    onboarding.classList.add('hidden');
  }

  document.getElementById('onboard-toggle-gemini').addEventListener('click', () => {
    onboardGeminiInput.type = onboardGeminiInput.type === 'password' ? 'text' : 'password';
  });
  document.getElementById('onboard-toggle-openrouter').addEventListener('click', () => {
    onboardOpenrouterInput.type = onboardOpenrouterInput.type === 'password' ? 'text' : 'password';
  });

  onboardSaveBtn.addEventListener('click', () => {
    const gk = onboardGeminiInput.value.trim();
    const ok = onboardOpenrouterInput.value.trim();
    if (!gk && !ok) {
      onboardSaveBtn.textContent = '⚠️ Enter at least one key';
      setTimeout(() => { onboardSaveBtn.textContent = 'Get Started →'; }, 2000);
      return;
    }
    const updates = {};
    if (gk) updates.gemini_api_key = gk;
    if (ok) updates.openrouter_api_key = ok;
    chrome.storage.local.set(updates, () => {
      hideOnboarding();
      initApp();
    });
  });

  // ---- Restore cache on popup open ----

  function initApp() {
    chrome.storage.session.get(['cached_result', 'cached_at', 'cached_domain', 'cached_stats'], (data) => {
      if (data.cached_result && data.cached_at && (Date.now() - data.cached_at < 10 * 60 * 1000)) {
        const domain = data.cached_domain ? JSON.parse(data.cached_domain) : { label: '📊 Data', key: 'generic' };
        const stats = data.cached_stats ? JSON.parse(data.cached_stats) : [];
        resultContent.innerHTML = buildInsightHTML(data.cached_result, domain, stats);
        showState('result');
        return;
      }
      showState('idle');
    });
  }

  chrome.storage.local.get(['gemini_api_key', 'openrouter_api_key'], (keys) => {
    if (!keys.gemini_api_key && !keys.openrouter_api_key) {
      showOnboarding();
    } else {
      initApp();
    }
  });

  // ============================================
  // ▼▼▼ ACTION LOGIC — MODIFY THIS PER PROJECT ▼▼▼
  // ============================================

  function buildInsightHTML(text, domainInfo, statChips) {
    const headerHtml = `<div class="insight-header">
      <span class="domain-badge">${domainInfo.label} Data</span>
      ${statChips.map(s => `<span class="stat-chip"><strong>${s.name}</strong> avg ${formatNum(s.avg)} · max ${formatNum(s.max)}</span>`).join('')}
    </div>`;

    let md = renderMarkdown(text);

    md = md.replace(
      /(<h3>The Story<\/h3>)([\s\S]*?)(?=<h3>|$)/,
      '$1<div class="story-callout">$2</div>'
    );
    md = md.replace(
      /(<h3>Top 3 Aha Moments<\/h3>)([\s\S]*?)(?=<h3>|$)/,
      '$1<div class="aha-list">$2</div>'
    );

    return headerHtml + md;
  }

  async function runAction() {
    showState('loading');
    try {
      const userInput = document.getElementById('custom-input')?.value.trim() || '';
      if (!userInput) {
        showError('Paste your spreadsheet data first — Ctrl+A, Ctrl+C from any sheet.');
        return;
      }
      const rawRows = userInput.trim().split('\n');
      if (rawRows.length < 2) {
        showError('Looks like only one row was pasted. Copy the full sheet including headers.');
        return;
      }

      // Phase 1: instant local analysis — domain + stats, no API needed
      const separator = rawRows[0].includes('\t') ? '\t' : ',';
      const parsedRows = rawRows.map(r => r.split(separator));
      const headers = parsedRows[0];
      const domainInfo = detectDomain(headers);
      const statChips = computeStats(parsedRows, headers);

      const statsContext = statChips.length
        ? statChips.map(s => `${s.name}: min ${formatNum(s.min)}, max ${formatNum(s.max)}, avg ${formatNum(s.avg)}, total ${formatNum(s.sum)}`).join('\n')
        : 'No numeric columns detected.';

      resultContent.innerHTML = `<div class="insight-header">
        <span class="domain-badge">${domainInfo.label} Data</span>
        ${statChips.map(s => `<span class="stat-chip"><strong>${s.name}</strong> avg ${formatNum(s.avg)} · max ${formatNum(s.max)}</span>`).join('')}
      </div><p class="loading-inline">⏳ Finding aha moments in ${rawRows.length} rows × ${headers.length} columns...</p>`;
      showState('result');

      // Phase 2: domain-aware Gemini call
      const fullPrompt = `You are analysing a ${domainInfo.label} spreadsheet (${domainInfo.key} domain).

Pre-computed stats — use these as grounding, do not just repeat them:
${statsContext}

Data (${rawRows.length} rows, ${headers.length} columns):
${userInput.slice(0, 11000)}

Respond ONLY in this exact structure — no extra headers, no deviations:

## The Story
[Exactly 2 sentences. Plain English. What is this dataset and what is the single most important thing it reveals? Name specific values.]

## Top 3 Aha Moments
1. [Most surprising finding — cite exact number, name, or value from the data]
2. [Second most surprising — specific, not generic]
3. [Third — specific]

## Hidden Patterns
- [Outlier or anomaly with exact value — which row/entry and why it stands out]
- [Category or group breakdown with percentages where calculable]
- [Trend, gap, or sequence issue — missing dates, plateau, spike, reversal]
- [Data quality issue if any: duplicates, blanks, inconsistent formatting]

## Smart Formulas
- **FORMULA_NAME** (\`=exact_formula_using_real_columns\`) — one line: what it calculates
- **FORMULA_NAME** (\`=exact_formula\`) — one line
- **FORMULA_NAME** (\`=exact_formula\`) — one line

Rules: every insight must reference specific values from THIS data. Formulas must use real column letters/names. No generic statements.`;

      chrome.runtime.sendMessage(
        {
          action: 'callGeminiBackground',
          prompt: fullPrompt,
          options: {
            systemInstruction: `You are a sharp ${domainInfo.key} data analyst. Spot non-obvious patterns. Be specific — cite actual values, names, and numbers from the data. Never give generic advice. Follow the exact output structure requested.`,
            temperature: 0.35,
          },
        },
        (response) => {
          if (response?.success) {
            resultContent.innerHTML = buildInsightHTML(response.data, domainInfo, statChips);
            showState('result');
            chrome.storage.session.set({ cached_result: response.data, cached_at: Date.now(), cached_domain: JSON.stringify(domainInfo), cached_stats: JSON.stringify(statChips) });
          } else {
            showError(response?.error || 'Analysis failed. Try again.');
          }
        }
      );
    } catch (err) {
      showError(err.message || 'Something went wrong.');
    }
  }

  // ============================================
  // ▲▲▲ END ACTION LOGIC ▲▲▲
  // ============================================

  // ---- Settings Panel ----

  function openSettings() {
    settingsPanel.classList.remove('hidden');
    settingsPanel.classList.add('fade-in');
    chrome.storage.local.get(['gemini_api_key', 'openrouter_api_key'], (data) => {
      geminiKeyInput.value = data.gemini_api_key || '';
      openrouterKeyInput.value = data.openrouter_api_key || '';
    });
  }

  function closeSettings() {
    settingsPanel.classList.add('hidden');
    settingsPanel.classList.remove('fade-in');
  }

  settingsBtn.addEventListener('click', openSettings);
  settingsClose.addEventListener('click', closeSettings);

  toggleGeminiKey.addEventListener('click', () => {
    geminiKeyInput.type = geminiKeyInput.type === 'password' ? 'text' : 'password';
  });
  toggleOpenrouterKey.addEventListener('click', () => {
    openrouterKeyInput.type = openrouterKeyInput.type === 'password' ? 'text' : 'password';
  });

  saveKeysBtn.addEventListener('click', () => {
    const updates = {};
    const gk = geminiKeyInput.value.trim();
    const ok = openrouterKeyInput.value.trim();
    if (gk) updates.gemini_api_key = gk;
    if (ok) updates.openrouter_api_key = ok;
    if (Object.keys(updates).length === 0) return;
    chrome.storage.local.set(updates, () => {
      saveKeysBtn.textContent = '✅ Saved';
      setTimeout(() => { saveKeysBtn.textContent = 'Save Keys'; }, 1500);
    });
  });

  clearKeysBtn.addEventListener('click', async () => {
    await resetApiKeys();
    geminiKeyInput.value = '';
    openrouterKeyInput.value = '';
    clearKeysBtn.textContent = '✅ Cleared';
    setTimeout(() => { clearKeysBtn.textContent = 'Clear All Keys'; }, 1500);
  });

  // ---- Event Listeners ----

  actionBtn.addEventListener('click', runAction);
  retryBtn.addEventListener('click', () => showState('idle'));
  rerunBtn.addEventListener('click', runAction);

  copyBtn.addEventListener('click', () => {
    const temp = document.createElement('div');
    temp.innerHTML = resultContent.innerHTML;
    const text = temp.textContent || temp.innerText;
    navigator.clipboard.writeText(text).then(() => {
      copyBtn.textContent = '✅';
      setTimeout(() => { copyBtn.textContent = '📋'; }, 1500);
    });
  });
});