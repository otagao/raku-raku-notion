/**
 * Content Script - Notion UI簡略化
 * www.notion.soでのみCSSを動的注入・削除してUIを簡略化する
 */

import type { PlasmoCSConfig } from "plasmo"
import customCssText from "data-text:~styles/notion-custom.css"

// www.notion.soでのみ実行
export const config: PlasmoCSConfig = {
  matches: ["https://www.notion.so/*"],
  all_frames: false,
  run_at: "document_start" // DOMロード前に実行（ちらつき防止）
}

const STYLE_ELEMENT_ID = 'raku-notion-simplify-styles'
const STORAGE_KEY = 'raku-ui-simplify-config'

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
  styleElement.textContent = customCssText

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
