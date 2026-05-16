# Sheet Brain

> Describe what you need. Get the formula.

A Chrome extension that generates custom Google Sheets formulas from plain English descriptions. No more Stack Overflow, no more formula docs — just describe what you want and get a copy-paste-ready answer.

![Demo](demo.gif)

## What it does

- **Formula** — the exact formula, ready to paste into any cell
- **How It Works** — plain English breakdown of each part
- **Example** — sample data showing the formula in action
- **Tips** — gotchas, variations, and alternatives

## How to use

1. Click the extension icon
2. Describe the formula you need in plain English (e.g. "sum rows where status is paid")
3. Hit **▶ Generate Functions**
4. Copy the formula into your sheet

## Setup

1. Load the extension in Chrome (`chrome://extensions` → Developer Mode → Load unpacked)
2. Click ⚙ and paste your [Gemini API key](https://aistudio.google.com/apikey)
3. Done

## Tech

- Chrome Extension Manifest V3
- Google Gemini API (with OpenRouter fallback)

---

Built by [@happy_ships](https://x.com/happy_ships) · Day 5/180
