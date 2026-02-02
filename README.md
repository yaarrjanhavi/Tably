# Tably – AI Tab Assistant

Tably is a Chrome extension + FastAPI backend that helps you manage too many browser tabs whether its your Music tab, Socials or even your Video tab

## What it does

- Groups tabs by topic using text embeddings.
- Scores tabs as **Read Now**, **Save For Later**, or **Maybe Close**.
- Shows short summaries for each tab.
- Lets you focus or close tabs directly from the popup.

## Tech stack

- Chrome Extension (Manifest V3, JavaScript, HTML, CSS)
- FastAPI (Python)
- sentence-transformers (`all-MiniLM-L6-v2`) for embeddings
- Simple clustering + heuristics for ranking

## How to run

1. Clone this repo:
```
git clone https://github.com/yaarrjanhavi/Tably.git
cd tably-tab-assistant
```

2. Backend (FastAPI):
```
cd backend
python -m venv venv
venv\Scripts\activate # on Windows
pip install -r requirements.txt
uvicorn main:app --reload
```

3. Extension:

- Open Chrome → `chrome://extensions`
- Turn on **Developer mode**
- Click **Load unpacked** and select the `extension` folder.

4. Click the Tably icon and press **Refresh analysis**.

## Folder structure

- `backend/` – FastAPI app (`main.py`)
- `extension/` – Chrome extension (manifest, popup, scripts)

## Why I built this
I built Tably because I constantly found myself drowning in open browser tabs and manually trying to remember what each one was about and which ones actually mattered. Instead of just relying on a basic tab closer, I wanted to explore how modern AI could understand page content and help make smarter decisions: group similar tabs, summarize them, and highlight what deserves attention right now.

This project was also a way to combine several skills in one place:
1. Browser UX – building a real Chrome extension that fits naturally into everyday browsing.
2. Backend & APIs – designing a FastAPI service that talks to the extension and processes tab data.
3. Practical AI/NLP – using embeddings, clustering, and summarization to turn raw page text into something actionable for a user.

Tably is both a tool that genuinely helps with my own messy browsing habits and a showcase of how to turn AI concepts into a polished, end‑to‑end product.
