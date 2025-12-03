(function () {
  console.log("Tab Assistant content script loaded on", window.location.href);

  function getVisibleText() {
    const body = document.body;
    if (!body) return "";
    let text = body.innerText || "";
    return text.slice(0, 4000); // cap length
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "GET_PAGE_TEXT") {
      const text = getVisibleText();
      console.log("Sending text length:", text.length, "for", window.location.href);
      sendResponse({ text });
      return true;
    }
  });
})();
