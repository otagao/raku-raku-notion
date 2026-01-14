import type { PlasmoCSConfig } from "plasmo"
import { StorageService } from "~services/storage"
import type { Language } from "~types"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"]
}

const OVERLAY_ID = "raku-raku-notion-iframe-overlay"
const WRAPPER_ID = "raku-raku-notion-iframe-wrapper"
const IFRAME_ID = "raku-raku-notion-iframe"
const CLOSE_ID = "raku-raku-notion-iframe-close"
const DRAG_BAR_ID = "raku-raku-notion-iframe-drag"

let dragMoveHandler: ((event: MouseEvent) => void) | null = null
let dragEndHandler: ((event: MouseEvent) => void) | null = null
let languageChangeHandler: ((changes: Record<string, chrome.storage.StorageChange>, areaName: string) => void) | null = null
const CLOSE_LABELS: Record<Language, string> = {
  ja: "閉じる",
  en: "Close"
}

const buildOverlay = () => {
  const overlay = document.createElement("div")
  overlay.id = OVERLAY_ID
  overlay.style.position = "fixed"
  overlay.style.inset = "0"
  overlay.style.background = "transparent"
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

  const dragBar = document.createElement("div")
  dragBar.id = DRAG_BAR_ID
  dragBar.style.height = "36px"
  dragBar.style.display = "flex"
  dragBar.style.alignItems = "center"
  dragBar.style.justifyContent = "space-between"
  dragBar.style.padding = "0 10px"
  dragBar.style.borderBottom = "1px solid #f0f0f0"
  dragBar.style.background = "#fbfbfb"
  dragBar.style.cursor = "move"
  dragBar.style.userSelect = "none"

  const dragTitle = document.createElement("span")
  dragTitle.textContent = "Raku Raku Notion"
  dragTitle.style.fontSize = "12px"
  dragTitle.style.color = "#6b6b6b"
  dragTitle.style.letterSpacing = "0.2px"

  const closeButton = document.createElement("button")
  closeButton.id = CLOSE_ID
  closeButton.textContent = "Close"
  closeButton.style.position = "relative"
  closeButton.style.padding = "4px 10px"
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

  dragBar.appendChild(dragTitle)
  dragBar.appendChild(closeButton)
  wrapper.appendChild(dragBar)
  wrapper.appendChild(iframe)
  overlay.appendChild(wrapper)

  attachDragHandlers(dragBar, wrapper)
  updateCloseLabel(closeButton)
  attachLanguageListener(closeButton)

  return overlay
}

const openOverlay = () => {
  if (document.getElementById(OVERLAY_ID)) return

  const overlay = buildOverlay()
  const parent = document.body || document.documentElement
  parent.appendChild(overlay)
}

const updateCloseLabel = async (button: HTMLButtonElement) => {
  try {
    const config = await StorageService.getLanguageConfig()
    const label = CLOSE_LABELS[config.language as Language] || "Close"
    button.textContent = label
  } catch {
    // keep default label
  }
}

const attachLanguageListener = (button: HTMLButtonElement) => {
  if (languageChangeHandler) return
  languageChangeHandler = (changes, areaName) => {
    if (areaName !== "local") return
    if (!changes["raku-language-config"]) return
    const next = changes["raku-language-config"]?.newValue
    const lang = (next?.language || "ja") as Language
    button.textContent = CLOSE_LABELS[lang] || "Close"
  }
  chrome.storage.onChanged.addListener(languageChangeHandler)
}

const attachDragHandlers = (dragBar: HTMLElement, wrapper: HTMLElement) => {
  const dragStart = (event: MouseEvent) => {
    if (event.button !== 0) return
    event.preventDefault()

    const rect = wrapper.getBoundingClientRect()
    wrapper.style.position = "absolute"
    wrapper.style.left = `${rect.left}px`
    wrapper.style.top = `${rect.top}px`
    wrapper.style.transform = "none"
    overlayFromWrapper(wrapper)?.style?.setProperty("align-items", "flex-start")
    overlayFromWrapper(wrapper)?.style?.setProperty("justify-content", "flex-start")

    const startX = event.clientX
    const startY = event.clientY
    const startLeft = rect.left
    const startTop = rect.top

    dragMoveHandler = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX
      const deltaY = moveEvent.clientY - startY
      const width = rect.width
      const height = rect.height
      const maxLeft = window.innerWidth - width - 8
      const maxTop = window.innerHeight - height - 8
      const nextLeft = Math.min(Math.max(startLeft + deltaX, 8), maxLeft)
      const nextTop = Math.min(Math.max(startTop + deltaY, 8), maxTop)
      wrapper.style.left = `${nextLeft}px`
      wrapper.style.top = `${nextTop}px`
    }

    dragEndHandler = () => {
      if (dragMoveHandler) {
        window.removeEventListener("mousemove", dragMoveHandler)
        dragMoveHandler = null
      }
      if (dragEndHandler) {
        window.removeEventListener("mouseup", dragEndHandler)
        window.removeEventListener("blur", dragEndHandler)
        document.removeEventListener("mouseleave", dragEndHandler)
        dragEndHandler = null
      }
    }

    window.addEventListener("mousemove", dragMoveHandler)
    window.addEventListener("mouseup", dragEndHandler)
    window.addEventListener("blur", dragEndHandler)
    document.addEventListener("mouseleave", dragEndHandler)
  }

  dragBar.addEventListener("mousedown", dragStart)
}

const overlayFromWrapper = (wrapper: HTMLElement) => {
  return wrapper.parentElement as HTMLElement | null
}

const closeOverlay = () => {
  const overlay = document.getElementById(OVERLAY_ID)
  if (overlay) {
    overlay.remove()
  }

  if (dragMoveHandler) {
    window.removeEventListener("mousemove", dragMoveHandler)
    dragMoveHandler = null
  }
  if (dragEndHandler) {
    window.removeEventListener("mouseup", dragEndHandler)
    dragEndHandler = null
  }
  if (languageChangeHandler) {
    chrome.storage.onChanged.removeListener(languageChangeHandler)
    languageChangeHandler = null
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
