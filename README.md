# Tably – AI Tab Assistant

Tably is a Chrome extension + FastAPI backend that helps you manage too many browser tabs.

## What it does

- Groups tabs by topic using text embeddings.
- Scores tabs as **Read now**, **Save for later**, or **Maybe close**.
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
