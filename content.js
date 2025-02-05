chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getH1") {
    const h1Element = document.querySelector('title');
    console.log("h1Element", h1Element);
    const content = h1Element ? h1Element.textContent : 'No se encontró elemento H1';
    console.log("content", content);
    sendResponse({ content });
  }
});
