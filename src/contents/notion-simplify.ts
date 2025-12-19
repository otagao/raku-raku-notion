/**
 * Content Script - Notion UI簡略化
 * www.notion.soでのみCSSを動的注入・削除してUIを簡略化する
 */

import type { PlasmoCSConfig } from "plasmo"

// www.notion.soでのみ実行
export const config: PlasmoCSConfig = {
  matches: ["https://www.notion.so/*"],
  all_frames: false,
  run_at: "document_start" // DOMロード前に実行（ちらつき防止）
}

const STYLE_ELEMENT_ID = 'raku-notion-simplify-styles'
const STORAGE_KEY = 'raku-ui-simplify-config'

// CSS定義（notion-custom.cssの内容をインライン化）
const CUSTOM_CSS = `
/* Notion UI Simplification Styles */
a:has(svg.aiFace) { display: none !important; }
div[style*="min-height: 27px"]:has(svg.inbox) { display: none !important; }
div[style*="min-height: 27px"]:has(svg.home) { display: none !important; }
div[style*="min-height: 27px"]:has(svg.magnifyingGlass) { display: none !important; }
div[style*="min-height: 27px"]:has(svg.gear) { display: none !important; }
div[style*="min-height: 24px"]:has(svg.templates) { display: none !important; }
div[style*="min-height: 24px"]:has(svg.trash) { display: none !important; }
.notion-sidebar-switcher { visibility: collapse; }
.notion-outliner-shared-header-container { visibility: collapse; }
.notion-ai-button { visibility: collapse; }
.notion-collection-automation-edit-view { display: none !important; }
.notion-topbar-share-menu { display: none !important; }
.notion-topbar-favorite-button { display: none !important; }
.notion-topbar-more-button { display: none !important; }
div[style*="height: 28px"][style*="width: 28px"][style*="padding: 0px"] { display: none !important; }
`

/**
 * CSSを注入してNotionのUIを簡略化
 */
function injectStyles(): void {
  // 既存のスタイル要素を削除（重複防止）
  const existing = document.getElementById(STYLE_ELEMENT_ID)
  if (existing) {
    existing.remove()
  }

  // スタイル要素を作成
  const styleElement = document.createElement('style')
  styleElement.id = STYLE_ELEMENT_ID
  styleElement.textContent = CUSTOM_CSS

  // headまたはbodyに追加
  const target = document.head || document.documentElement
  target.appendChild(styleElement)

  console.log('[Notion Simplify] Styles injected')
}

/**
 * 注入したCSSを削除
 */
function removeStyles(): void {
  const styleElement = document.getElementById(STYLE_ELEMENT_ID)
  if (styleElement) {
    styleElement.remove()
    console.log('[Notion Simplify] Styles removed')
  }
}

/**
 * 初期化: ストレージから設定を読み込み、必要に応じてCSSを注入
 */
async function initialize(): Promise<void> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY)
    const config = result[STORAGE_KEY]

    if (config?.enabled) {
      injectStyles()
    }
  } catch (error) {
    console.error('[Notion Simplify] Initialization error:', error)
  }
}

/**
 * ストレージ変更を監視し、リアルタイムでCSSを適用/削除
 */
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') return

  const configChange = changes[STORAGE_KEY]
  if (!configChange) return

  const newConfig = configChange.newValue
  const oldConfig = configChange.oldValue

  // 設定が変更された場合
  if (newConfig?.enabled !== oldConfig?.enabled) {
    if (newConfig?.enabled) {
      injectStyles()
    } else {
      removeStyles()
    }
    console.log('[Notion Simplify] Config changed:', newConfig?.enabled ? 'enabled' : 'disabled')
  }
})

// 初期化を実行
initialize()

console.log('[Notion Simplify] Content Script loaded')
