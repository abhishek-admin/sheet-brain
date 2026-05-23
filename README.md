# 🧠 Sheet Brain

> **Paste your sheet. Get hidden insights.**
> Instantly uncovers trends, outliers, budget leaks, and custom spreadsheet formulas using your actual column names.

<div align="center">

[![Chrome MV3](https://img.shields.io/badge/Chrome-Manifest_V3-7C6AFF?style=for-the-badge&logo=google-chrome&logoColor=white)](https://developer.chrome.com/docs/extensions/)
[![Gemini AI](https://img.shields.io/badge/Gemini-2.0_Flash-D4AF37?style=for-the-badge&logo=google-gemini&logoColor=white)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-MIT-emerald?style=for-the-badge)](LICENSE)
[![Streak](https://img.shields.io/badge/Day-05_/_180-vanilla?style=for-the-badge&logo=github&logoColor=white)](https://x.com/happy_ships)

</div>

---

## 📖 The Problem & The Solution

Most spreadsheet assistants help you write formulas when you already know what you want to calculate. But the hardest part of working with data is seeing what you missed: the sudden outlier, the vendor eating 60% of your budget, or the trend hiding in plain sight.

**Sheet Brain** does something different. Simply copy and paste your cells directly from Excel, Google Sheets, or LibreOffice. It calculates baseline statistics locally, automatically detects your data's domain, and runs AI diagnostics to deliver high-value insights and tailored spreadsheet formulas featuring your exact column names.

![Demo Screen](sheetbr.gif)

---

## ⚡ Core Features

- 🔍 **Dynamic Domain Classification** — Automatically detects your dataset's domain (e.g., Sales, HR, Finance, Inventory, Marketing, or Generic) with zero manual inputs.
- 🚀 **Local Math Caching** — Instantly calculates min, max, average, and row counts locally, displaying them as responsive UI chips while the AI is thinking.
- 📝 **The Plain-English Story** — Summarizes what your dataset actually reveals in two high-impact, value-backed sentences.
- 💡 **Top 3 "Aha" Moments** — Extracts the three most surprising findings or structural behaviors, citing exact numerical anomalies.
- 📈 **Pattern & Outlier Diagnostics** — Flags data quality gaps, inventory levels, category allocations, and budget spikes.
- 📐 **Column-Aware Formulas** — Recommends ready-to-paste spreadsheet formulas using your exact, real-world column names.

---

## 🛠 Getting Started

### 1. Load the Extension
1. Clone this repository locally.
2. Open Chrome and navigate to `chrome://extensions`.
3. Toggle on **Developer mode** in the top right.
4. Click **Load unpacked** and select the `sheet-brain` folder.

### 2. Configure Your Keys
On your first launch, the setup screen will ask for your key:
- **Gemini Key** — Get one for free at [aistudio.google.com](https://aistudio.google.com/apikey).
- **OpenRouter Key** (fallback) — Get one at [openrouter.ai](https://openrouter.ai).

> [!NOTE]
> All keys are stored securely in Chrome's local storage and are never uploaded or shared.

---

## 🔧 Technical Stack

- **Extension Framework**: Chrome Extension Manifest V3
- **Primary AI Engine**: Gemini 2.0 Flash via AI Studio SDK
- **Fallback Engine**: OpenRouter API
- **Client Implementation**: Pure Vanilla JS, no build steps, zero bulky dependencies. Runs directly out of the folder.

---

## 📅 180 Days of Building
This project is part of a larger developer journey: shipping one useful AI tool/extension every day for 180 days.

Follow along for daily releases and tech-stack deep dives:
- **Twitter / X**: [@happy_ships](https://x.com/happy_ships)
- **Day**: `05 / 180`
- **Next Release**: `Bias Heatmap`

---

*Licensed under the [MIT License](LICENSE).*
