import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"]
}

const OVERLAY_ID = "raku-raku-notion-iframe-overlay"
const WRAPPER_ID = "raku-raku-notion-iframe-wrapper"
const IFRAME_ID = "raku-raku-notion-iframe"
const CLOSE_ID = "raku-raku-notion-iframe-close"

let keydownHandler: ((event: KeyboardEvent) => void) | null = null

const buildOverlay = () => {
  const overlay = document.createElement("div")
  overlay.id = OVERLAY_ID
  overlay.style.position = "fixed"
  overlay.style.inset = "0"
  overlay.style.background = "rgba(0, 0, 0, 0.28)"
  overlay.style.display = "flex"
  overlay.style.alignItems = "center"
  overlay.style.justifyContent = "center"
  overlay.style.zIndex = "2147483647"

  const wrapper = document.createElement("div")
  wrapper.id = WRAPPER_ID
  wrapper.style.position = "relative"
  wrapper.style.width = "420px"
  wrapper.style.height = "620px"
  wrapper.style.maxWidth = "92vw"
  wrapper.style.maxHeight = "92vh"
  wrapper.style.borderRadius = "16px"
  wrapper.style.boxShadow = "0 20px 60px rgba(0, 0, 0, 0.35)"
  wrapper.style.overflow = "hidden"
  wrapper.style.background = "#ffffff"

  const closeButton = document.createElement("button")
  closeButton.id = CLOSE_ID
  closeButton.textContent = "Close"
  closeButton.style.position = "absolute"
  closeButton.style.top = "8px"
  closeButton.style.right = "8px"
  closeButton.style.zIndex = "1"
  closeButton.style.padding = "6px 10px"
  closeButton.style.fontSize = "12px"
  closeButton.style.borderRadius = "999px"
  closeButton.style.border = "1px solid #e0e0e0"
  closeButton.style.background = "#ffffff"
  closeButton.style.cursor = "pointer"

  const iframe = document.createElement("iframe")
  iframe.id = IFRAME_ID
  iframe.title = "Raku Raku Notion"
  iframe.style.width = "100%"
  iframe.style.height = "100%"
  iframe.style.border = "0"
  iframe.style.display = "block"
  iframe.allow = "clipboard-write"
  iframe.src = `${chrome.runtime.getURL("popup.html")}?ui=iframe`

  closeButton.addEventListener("click", () => {
    closeOverlay()
  })

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeOverlay()
    }
  })

  wrapper.appendChild(closeButton)
  wrapper.appendChild(iframe)
  overlay.appendChild(wrapper)

  return overlay
}

const openOverlay = () => {
  if (document.getElementById(OVERLAY_ID)) return

  const overlay = buildOverlay()
  const parent = document.body || document.documentElement
  parent.appendChild(overlay)

  keydownHandler = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      closeOverlay()
    }
  }
  document.addEventListener("keydown", keydownHandler)
}

const closeOverlay = () => {
  const overlay = document.getElementById(OVERLAY_ID)
  if (overlay) {
    overlay.remove()
  }

  if (keydownHandler) {
    document.removeEventListener("keydown", keydownHandler)
    keydownHandler = null
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "open-iframe-ui") {
    openOverlay()
    sendResponse?.({ success: true })
    return true
  }

  if (message?.type === "close-iframe-ui") {
    closeOverlay()
    sendResponse?.({ success: true })
    return true
  }
})
