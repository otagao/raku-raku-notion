import type { PlasmoCSConfig } from "plasmo"
import { StorageService } from "~services/storage"
import type { Language } from "~types"

export const config: PlasmoCSConfig = {
  matches: []  // 動的注入のため自動注入を無効化
}

const HOST_ID = "raku-raku-notion-iframe-host"
const OVERLAY_ID = "raku-raku-notion-iframe-overlay"
const WRAPPER_ID = "raku-raku-notion-iframe-wrapper"
const IFRAME_ID = "raku-raku-notion-iframe"
const CLOSE_ID = "raku-raku-notion-iframe-close"
const DRAG_BAR_ID = "raku-raku-notion-iframe-drag"

let uiHost: HTMLElement | null = null
let uiShadow: ShadowRoot | null = null
let dragPointerId: number | null = null
let dragMoveHandler: ((event: PointerEvent) => void) | null = null
let dragEndHandler: ((event: PointerEvent) => void) | null = null
let languageChangeHandler: ((changes: Record<string, chrome.storage.StorageChange>, areaName: string) => void) | null = null
const CLOSE_LABELS: Record<Language, string> = {
  ja: "閉じる",
  en: "Close"
}

const buildOverlay = () => {
  const host = document.createElement("div")
  host.id = HOST_ID
  host.style.position = "fixed"
  host.style.inset = "0"
  host.style.zIndex = "2147483647"
  host.style.pointerEvents = "none"

  const shadow = host.attachShadow({ mode: "open" })
  uiHost = host
  uiShadow = shadow

  const overlay = document.createElement("div")
  overlay.id = OVERLAY_ID
  overlay.style.position = "fixed"
  overlay.style.inset = "0"
  overlay.style.background = "transparent"
  overlay.style.display = "flex"
  overlay.style.alignItems = "flex-start"
  overlay.style.justifyContent = "flex-end"
  overlay.style.padding = "16px"
  overlay.style.zIndex = "2147483647"
  overlay.style.fontFamily = "-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif"
  overlay.style.pointerEvents = "none"

  const wrapper = document.createElement("div")
  wrapper.id = WRAPPER_ID
  wrapper.style.position = "relative"
  wrapper.style.width = "400px"
  wrapper.style.height = "620px"
  wrapper.style.maxWidth = "92vw"
  wrapper.style.maxHeight = "92vh"
  wrapper.style.borderRadius = "16px"
  wrapper.style.boxShadow = "0 20px 60px rgba(0, 0, 0, 0.35)"
  wrapper.style.overflow = "hidden"
  wrapper.style.background = "#ffffff"
  wrapper.style.pointerEvents = "auto"

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
  dragBar.style.touchAction = "none"

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
  closeButton.style.color = "#1f1f1f"
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

  closeButton.addEventListener("pointerdown", (event) => {
    event.stopPropagation()
  })

  closeButton.addEventListener("click", (event) => {
    event.stopPropagation()
    closeOverlay()
  })

  dragBar.appendChild(dragTitle)
  dragBar.appendChild(closeButton)
  wrapper.appendChild(dragBar)
  wrapper.appendChild(iframe)
  overlay.appendChild(wrapper)
  shadow.appendChild(overlay)

  attachDragHandlers(dragBar, wrapper)
  updateCloseLabel(closeButton)
  attachLanguageListener(closeButton)

  return host
}

const openOverlay = () => {
  if (document.getElementById(HOST_ID)) return

  const host = buildOverlay()
  const parent = document.body || document.documentElement
  parent.appendChild(host)
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
  const dragStart = (event: PointerEvent) => {
    if (event.button !== 0) return
    if ((event.target as HTMLElement | null)?.closest(`#${CLOSE_ID}`)) return
    event.preventDefault()
    if (dragPointerId !== null) return
    dragPointerId = event.pointerId
    dragBar.setPointerCapture(event.pointerId)

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

    dragMoveHandler = (moveEvent: PointerEvent) => {
      if (dragPointerId !== moveEvent.pointerId) return
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

    dragEndHandler = (endEvent: PointerEvent) => {
      if (dragPointerId !== endEvent.pointerId) return
      try {
        dragBar.releasePointerCapture(endEvent.pointerId)
      } catch {
        // ignore release errors
      }
      dragPointerId = null
      if (dragMoveHandler) {
        dragBar.removeEventListener("pointermove", dragMoveHandler)
        dragMoveHandler = null
      }
      if (dragEndHandler) {
        dragBar.removeEventListener("pointerup", dragEndHandler)
        dragBar.removeEventListener("pointercancel", dragEndHandler)
        dragEndHandler = null
      }
    }

    dragBar.addEventListener("pointermove", dragMoveHandler)
    dragBar.addEventListener("pointerup", dragEndHandler)
    dragBar.addEventListener("pointercancel", dragEndHandler)
  }

  dragBar.addEventListener("pointerdown", dragStart)
}

const overlayFromWrapper = (wrapper: HTMLElement) => {
  return wrapper.parentElement as HTMLElement | null
}

const closeOverlay = () => {
  if (uiHost) {
    uiHost.remove()
  }
  uiHost = null
  uiShadow = null
  dragPointerId = null

  if (dragMoveHandler) {
    dragMoveHandler = null
  }
  if (dragEndHandler) {
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

  // ping応答（Content Script注入確認用）
  if (message?.type === "ping-iframe-ui") {
    sendResponse?.({ success: true })
    return true
  }
})
