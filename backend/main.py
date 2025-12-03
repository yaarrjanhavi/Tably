from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict

from sentence_transformers import SentenceTransformer
import numpy as np
from sklearn.cluster import KMeans

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # dev only
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Tab Assistant backend is running"}

@app.get("/ping")
def ping():
    return {"status": "ok"}

# ---------- Models ----------

class TabInput(BaseModel):
    title: str
    url: str
    text: str = ""

class TabWithInfo(BaseModel):
    title: str
    url: str
    category: str
    importance: str
    word_count: int
    topic: str
    summary: str | None = None

class AnalyzeRequest(BaseModel):
    tabs: List[TabInput]

class AnalyzeSummary(BaseModel):
    category: str
    count: int

class AnalyzeResponse(BaseModel):
    tab_count: int
    by_category: List[AnalyzeSummary]
    tabs: List[TabWithInfo]

# ---------- Embedding model ----------

embed_model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

# ---------- Categorization rules ----------

SOCIAL_DOMAINS = ["facebook.com", "instagram.com", "twitter.com", "x.com", "linkedin.com"]
VIDEO_DOMAINS = ["youtube.com", "netflix.com", "primevideo.com"]
MAIL_DOMAINS = ["gmail.com", "outlook.com", "mail.google.com"]

def categorize_tab(url: str) -> str:
    low = url.lower()
    if any(d in low for d in SOCIAL_DOMAINS):
        return "social"
    if any(d in low for d in VIDEO_DOMAINS):
        return "video"
    if any(d in low for d in MAIL_DOMAINS):
        return "email"
    if "docs.google.com" in low or "notion.so" in low or "confluence." in low:
        return "docs/notes"
    if "github.com" in low or "stackoverflow.com" in low:
        return "dev"
    return "other"

# ---------- Importance rules ----------

def score_importance(title: str, url: str, category: str) -> str:
    title_len = len(title or "")
    if category in ("dev", "docs/notes", "email"):
        if title_len > 20:
            return "read_now"
        else:
            return "save_for_later"
    if category in ("social", "video"):
        if title_len < 15:
            return "close_candidate"
        else:
            return "save_for_later"
    if title_len > 30:
        return "save_for_later"
    else:
        return "close_candidate"

# ---------- Topic computation ----------

def compute_topics(tab_inputs: List[TabInput]) -> List[str]:
    texts = []
    for t in tab_inputs:
        base = t.title or ""
        extra = (t.text or "")[:500]
        combined = (base + " " + extra).strip()
        if not combined:
            combined = "(empty)"
        texts.append(combined)

    embs = embed_model.encode(texts, normalize_embeddings=True)
    embs = np.array(embs)

    n = embs.shape[0]
    if n == 0:
        return []

    k = max(1, min(5, int(np.sqrt(n))))
    if k == 1:
        labels = np.zeros(n, dtype=int)
    else:
        kmeans = KMeans(n_clusters=k, random_state=42, n_init="auto")
        labels = kmeans.fit_predict(embs)

    topics = [""] * n
    for cluster_id in range(k):
        indices = [i for i, lab in enumerate(labels) if lab == cluster_id]
        if not indices:
            continue
        rep_title = tab_inputs[indices[0]].title or "Topic"
        for i in indices:
            topics[i] = rep_title

    topics = [t if t else "General" for t in topics]
    return topics

# ---------- Summarization helper ----------

def simple_summary(text: str, max_words: int = 40) -> str:
    words = (text or "").split()
    if not words:
        return ""
    if len(words) <= max_words:
        return " ".join(words)
    return " ".join(words[:max_words]) + " ..."

# ---------- Main endpoint ----------

@app.post("/analyze_tabs", response_model=AnalyzeResponse)
def analyze_tabs(req: AnalyzeRequest):
    topics = compute_topics(req.tabs)

    categorized: List[TabWithInfo] = []
    counts: Dict[str, int] = {}

    for index, t in enumerate(req.tabs):
        cat = categorize_tab(t.url)
        imp = score_importance(t.title, t.url, cat)
        wc = len((t.text or "").split())
        topic = topics[index] if index < len(topics) else "General"
        summary_text = simple_summary(t.text)

        categorized.append(
            TabWithInfo(
                title=t.title,
                url=t.url,
                category=cat,
                importance=imp,
                word_count=wc,
                topic=topic,
                summary=summary_text,
            )
        )
        counts[cat] = counts.get(cat, 0) + 1

    by_category = [
        AnalyzeSummary(category=k, count=v)
        for k, v in counts.items()
    ]

    return AnalyzeResponse(
        tab_count=len(req.tabs),
        by_category=by_category,
        tabs=categorized,
    )
