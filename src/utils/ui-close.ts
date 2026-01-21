export const isIframeUi = (): boolean => {
  try {
    const params = new URLSearchParams(window.location.search)
    return params.get("ui") === "iframe"
  } catch {
    return false
  }
}

export const requestUiClose = (): void => {
  if (isIframeUi()) {
    chrome.runtime.sendMessage({ type: "close-iframe-ui" })
    return
  }

  window.close()
}
