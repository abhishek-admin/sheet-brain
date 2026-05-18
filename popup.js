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

  const sheetBar = document.getElementById('sheet-bar');
  const sheetBarName = document.getElementById('sheet-bar-name');
  const sheetHint = document.getElementById('sheet-hint');
  const suggestBtn = document.getElementById('suggest-btn');

  const settingsBtn = document.getElementById('settings-btn');
  const settingsPanel = document.getElementById('settings-panel');
  const settingsClose = document.getElementById('settings-close');
  const geminiKeyInput = document.getElementById('gemini-key-input');
  const openrouterKeyInput = document.getElementById('openrouter-key-input');
  const saveKeysBtn = document.getElementById('save-keys-btn');
  const clearKeysBtn = document.getElementById('clear-keys-btn');
  const toggleGeminiKey = document.getElementById('toggle-gemini-key');
  const toggleOpenrouterKey = document.getElementById('toggle-openrouter-key');

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

  // ---- Restore cache on popup open ----

  chrome.storage.session.get(['cached_result', 'cached_at'], (data) => {
    if (data.cached_result && data.cached_at) {
      if (Date.now() - data.cached_at < 10 * 60 * 1000) {
        resultContent.innerHTML = renderMarkdown(data.cached_result);
        showState('result');
        return;
      }
    }
    showState('idle');
  });

  // ============================================
  // ▼▼▼ SHEET DETECTION — runs on popup open ▼▼▼
  // ============================================

  // Standalone — must not reference outer scope (serialized for executeScript)
  function extractSheetData() {
    const title = document.title.replace(/ - Google Sheets$/, '').trim();
    const cells = [];
    const strategies = [
      '[role="gridcell"]',
      '.waffle td',
      '[data-row-index] .cell-value',
    ];
    for (const sel of strategies) {
      const els = document.querySelectorAll(sel);
      if (els.length > 3) {
        let n = 0;
        els.forEach(el => {
          const t = (el.textContent || el.innerText || '').trim();
          if (t && n < 60) { cells.push(t); n++; }
        });
        break;
      }
    }
    return { title, cells };
  }

  async function detectSheetContext() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const url = tab?.url || '';
      if (url.includes('docs.google.com/spreadsheets')) {
        const sheetName = (tab.title || '').replace(/ - Google Sheets$/, '').trim() || 'Spreadsheet';
        sheetBarName.textContent = `📊 ${sheetName}`;
        sheetBar.classList.remove('hidden');

        // Try to extract visible cell data for the suggest button
        try {
          const [{ result }] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: extractSheetData,
          });
          window._sheetCtx = result;
        } catch {
          window._sheetCtx = { title: sheetName, cells: [] };
        }
      } else {
        sheetHint.classList.remove('hidden');
      }
    } catch {
      // Non-critical — silently skip if tab access fails
    }
  }

  detectSheetContext();

  suggestBtn.addEventListener('click', () => {
    const ctx = window._sheetCtx;
    if (!ctx) return;
    showState('loading');

    const dataLine = ctx.cells.length > 3
      ? `Visible cell data (first ~60 cells): ${ctx.cells.join(', ')}`
      : `Sheet name: "${ctx.title}" (cell data unavailable — suggest based on name and common patterns)`;

    const suggestPrompt = `Google Sheet: "${ctx.title}"
${dataLine}

Analyze this spreadsheet and suggest 3–4 genuinely useful formulas for THIS specific data. For each:

## 💡 [Formula purpose — specific to the columns visible]
\`\`\`
[exact formula using the actual column letters/names from the data above]
\`\`\`
**When to use:** [one line, specific to this sheet]
**Example:** [using actual values or column names visible in the data]

Be specific to the columns and data types visible — not generic Sheets tutorials.`;

    chrome.runtime.sendMessage(
      {
        action: 'callGeminiBackground',
        prompt: suggestPrompt,
        options: {
          systemInstruction: 'You are a Google Sheets expert analyzing a real spreadsheet. Suggest formulas that directly apply to the visible column names and data. Use the actual column letters and header names in your examples.',
          temperature: 0.3,
        },
      },
      (response) => {
        if (response?.success) showResult(response.data, false);
        else showError(response?.error || 'Could not analyze the sheet. Try describing what you need below.');
      }
    );
  });

  // ============================================
  // ▲▲▲ END SHEET DETECTION ▲▲▲
  // ============================================

  // ============================================
  // ▼▼▼ ACTION LOGIC — MODIFY THIS PER PROJECT ▼▼▼
  // ============================================

  async function runAction() {
    showState('loading');
    try {
      const userInput = document.getElementById('custom-input')?.value.trim() || '';
      if (!userInput) { showError('Describe the Sheets function you need.'); return; }

      // Phase 1: Instant local preview — no API call
      const snippet = userInput.length > 70 ? userInput.slice(0, 70) + '...' : userInput;
      showResult(`## Building formula for:\n\n*"${snippet}"*\n\n*Gemini is generating the exact formula...*`, true);

      // Phase 2: Full formula — single API call
      const fullPrompt = `Google Sheets request: "${userInput}"

Generate the formula or solution:

## Formula
\`\`\`
[The exact formula ready to paste — include all parameters]
\`\`\`

## How It Works
[Plain English breakdown — what each part does, what to replace with your own data]

## Example
| Input | Formula | Output |
|-------|---------|--------|
| [sample data] | [formula applied] | [result] |

## Tips
[Gotchas, variations, or alternatives worth knowing]

The formula must be copy-paste ready.`;

      chrome.runtime.sendMessage(
        {
          action: 'callGeminiBackground',
          prompt: fullPrompt,
          options: {
            systemInstruction: 'You are a Google Sheets expert. Provide accurate, copy-paste-ready formulas with clear explanations. Use code blocks for all formulas.',
            temperature: 0.3,
          },
        },
        (response) => {
          if (response?.success) showResult(response.data, false);
          else showError(response?.error || 'Formula generation failed. Try again.');
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