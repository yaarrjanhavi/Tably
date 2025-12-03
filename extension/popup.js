document.addEventListener("DOMContentLoaded", () => {
  const refreshBtn = document.getElementById("refreshButton");
  const backendBtn = document.getElementById("backendButton");
  const backendOutput = document.getElementById("backendOutput");
  const analysisContainer = document.getElementById("analysisContainer");

  // Check backend (ping)
  backendBtn.addEventListener("click", async () => {
    backendOutput.textContent = "Talking to backend...";
    try {
      const response = await fetch("http://127.0.0.1:8000/ping");
      const data = await response.json();
      backendOutput.textContent = "Backend says: " + JSON.stringify(data);
    } catch (err) {
      backendOutput.textContent = "Error talking to backend: " + err;
    }
  });

  // Helper: ask a tab's content script for text
  function getTabText(tab) {
    return new Promise((resolve) => {
      if (!tab.id) {
        resolve("");
        return;
      }
      try {
        chrome.tabs.sendMessage(
          tab.id,
          { type: "GET_PAGE_TEXT" },
          (response) => {
            if (chrome.runtime.lastError || !response) {
              console.log("No response for tab", tab.id, tab.url, chrome.runtime.lastError);
              resolve("");
            } else {
              const text = response.text || "";
              console.log("Got text for tab", tab.id, "length", text.length);
              resolve(text);
            }
          }
        );
      } catch (e) {
        console.log("Error sending message to tab", tab.id, e);
        resolve("");
      }
    });
  }

  async function runAnalysis() {
    analysisContainer.innerHTML = "";
    const summaryDiv = document.createElement("div");
    summaryDiv.className = "tably-summary";
    summaryDiv.textContent = "Collecting and analyzing tabs...";
    analysisContainer.appendChild(summaryDiv);

    // Get tabs
    const tabs = await chrome.tabs.query({ currentWindow: true });

    // Collect text
    const tabsWithText = [];
    for (const tab of tabs) {
      const text = await getTabText(tab);
      tabsWithText.push({
        id: tab.id,
        windowId: tab.windowId,
        title: tab.title || "",
        url: tab.url || "",
        text: text || ""
      });
    }

    const payload = { tabs: tabsWithText.map(({ title, url, text }) => ({ title, url, text })) };

    try {
      const res = await fetch("http://127.0.0.1:8000/analyze_tabs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      const lines = [];
      lines.push(`<strong>Total tabs:</strong> ${data.tab_count}`);

      if (Array.isArray(data.by_category)) {
        lines.push("By category:");
        data.by_category.forEach((item) => {
          lines.push(`- ${item.category}: ${item.count}`);
        });
      }

      summaryDiv.innerHTML = lines.join("<br/>");

      // Prepare sections
      const sections = {
        read_now: [],
        save_for_later: [],
        close_candidate: []
      };

      data.tabs.forEach((t, idx) => {
        const originalTab = tabsWithText[idx];

        const card = document.createElement("div");
        card.className = "tably-tab-card " + (t.importance || "");

        // Title
        const titleEl = document.createElement("div");
        titleEl.className = "tably-tab-title";
        titleEl.textContent = t.title || "(No title)";
        card.appendChild(titleEl);

        // Meta
        const metaEl = document.createElement("div");
        metaEl.className = "tably-tab-meta";

        const topicChip = document.createElement("span");
        topicChip.className = "tably-chip";
        topicChip.textContent = t.topic || "Topic";

        const catChip = document.createElement("span");
        catChip.className = "tably-chip";
        catChip.textContent = t.category || "other";

        const impChip = document.createElement("span");
        impChip.className = "tably-chip " + (t.importance || "");
        impChip.textContent =
          t.importance === "read_now"
            ? "Read now"
            : t.importance === "save_for_later"
            ? "Save"
            : "Maybe close";

        const wordsSpan = document.createElement("span");
        wordsSpan.textContent = ` · ${t.word_count} words`;

        metaEl.appendChild(topicChip);
        metaEl.appendChild(catChip);
        metaEl.appendChild(impChip);
        metaEl.appendChild(wordsSpan);

        card.appendChild(metaEl);

        // Summary
        if (t.summary) {
          const summaryEl = document.createElement("div");
          summaryEl.className = "tably-tab-summary";
          summaryEl.textContent = t.summary;
          card.appendChild(summaryEl);
        }

        // Actions
        const actions = document.createElement("div");
        actions.className = "tably-actions";

        const focusBtn = document.createElement("button");
        focusBtn.textContent = "Focus tab";
        focusBtn.className = "secondary";
        focusBtn.addEventListener("click", () => {
          chrome.windows.update(originalTab.windowId, { focused: true });
          chrome.tabs.update(originalTab.id, { active: true });
        });

        const closeBtn = document.createElement("button");
        closeBtn.textContent = "Close";
        closeBtn.addEventListener("click", () => {
          chrome.tabs.remove(originalTab.id);
          card.remove();
        });

        actions.appendChild(focusBtn);
        actions.appendChild(closeBtn);
        card.appendChild(actions);

        const bucket = sections[t.importance] || sections.save_for_later;
        bucket.push(card);
      });

      // Render sections in order
      function addSection(title, items) {
        if (!items.length) return;
        const titleEl = document.createElement("div");
        titleEl.className = "tably-section-title";
        titleEl.textContent = title;
        analysisContainer.appendChild(titleEl);
        items.forEach((card) => analysisContainer.appendChild(card));
      }

      addSection("Read now", sections.read_now);
      addSection("Save for later", sections.save_for_later);
      addSection("Maybe close", sections.close_candidate);
    } catch (err) {
      summaryDiv.textContent = "Could not analyze tabs: " + err;
    }
  }

  // Initial run
  runAnalysis();

  // Manual refresh
  refreshBtn.addEventListener("click", runAnalysis);
});
