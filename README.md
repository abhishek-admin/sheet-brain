# Sheet Brain

> Describe what you need. Get the formula.

**Day 05 / 180 — 180 Days of Building**

Google Sheets formulas are powerful but brutal to learn. You know what you want — you just can't remember if it's VLOOKUP or INDEX MATCH or something else entirely. Describe your goal in plain English and Sheet Brain gives you the exact formula, how it works, a sample dataset showing it in action, and the gotchas to watch out for.

![Demo](demo.gif)

---

## What it does

- **Formula** — the exact formula, ready to paste into any cell
- **How It Works** — plain English breakdown of every part of the formula
- **Example** — sample data showing the formula working with real values
- **Tips** — gotchas, common variations, and alternatives to consider

Works for any formula need: lookups, conditionals, text manipulation, date math, array formulas, and more.

---

## How to use

1. Click the extension icon
2. Describe the formula you need in plain English (e.g. *"sum rows where status is Paid"* or *"count unique values in column B"*)
3. Hit **Generate Functions**
4. Copy the formula directly into your sheet

---

## Setup

### 1. Load the extension
1. Go to `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked** → select the `sheet-brain` folder

### 2. Add your API key
Click **⚙** in the popup and paste one of the following:

- **Gemini API key** — free at [aistudio.google.com](https://aistudio.google.com/apikey)
- **OpenRouter API key** — free tier at [openrouter.ai](https://openrouter.ai) (use as fallback if Gemini quota runs out)

Only one key is required. If both are saved, Gemini is used first with OpenRouter as fallback.

---

## Tech stack

- Chrome Extension Manifest V3
- Gemini 2.0 Flash (primary) → OpenRouter fallback
- Vanilla JS — no frameworks, no build step

---

## Part of 180 Days of Building

Shipping one AI Chrome extension every day for 180 days.

Follow along: [@happy_ships](https://x.com/happy_ships)
