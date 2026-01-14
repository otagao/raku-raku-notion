import React, { type FC } from "react"
import type { Clipboard, NotionDatabaseSummary, Language } from "~types"
import { TooltipIcon } from "~components/TooltipIcon"
import { requestUiClose } from "~utils/ui-close"

interface ClipboardListScreenProps {
  clipboards: Clipboard[]
  onNavigate: (screen: string, clipboardId?: string) => void
  onDeleteClipboard?: (clipboardId: string) => void
  availableDatabases?: NotionDatabaseSummary[]
  onImportDatabase?: (database: NotionDatabaseSummary) => void
  onRefreshDatabases?: () => void
  isLoadingDatabases?: boolean
  databaseError?: string | null
  databaseInfoMessage?: string | null
  language: Language
}

const translations: Record<Language, {
  back: string
  title: string
  createdByExtension: string
  createdAt: string
  lastSaved: string
  delete: string
  addNew: string
  emptyTitle: string
  emptyAction: string
  emptyHint: string
  selectHint: string
  availableTitle: string
  refresh: string
  refreshing: string
  availableHint: string
  noAvailable: string
  unregistered: string
  register: string
  deleteConfirm: string
  updatedAt: string
  noClipboards: string
  tooltipExistingDatabases: string
}> = {
  ja: {
    back: '← 戻る',
    title: '保存先データベース一覧',
    createdByExtension: '',
    createdAt: '作成日',
    lastSaved: '最終保存日時',
    delete: '保存先リストから除外',
    addNew: '+ 新しい保存先データベースを追加',
    emptyTitle: 'クリップボードがまだありません',
    emptyAction: '新規作成',
    emptyHint: 'まだ登録されたクリップボードはありません。下の既存データベースから追加できます。',
    selectHint: 'まだ登録されたクリップボードはありません。下の既存データベースから追加できます。',
    availableTitle: '一覧に登録されていないデータベース',
    refresh: '更新',
    refreshing: '取得中...',
    availableHint: '「保存先データベース一覧」に含まれないデータベースをワークスペースから取得・表示します。\n基本的には拡張機能で作成したもののみ取得されます。',
    noAvailable: '表示できるデータベースはありません。',
    unregistered: '未登録',
    register: '保存先データベースとして登録',
    deleteConfirm: 'この保存先データベースを保存先リストから除外しますか？',
    updatedAt: '最終更新',
    noClipboards: 'まだ登録されたクリップボードはありません。',
    tooltipExistingDatabases: 'Notionワークスペースにある既存のデータベースで、まだ保存先として登録されていないものを表示します'
  },
  en: {
    back: '← Back',
    title: 'Destination Databases',
    createdByExtension: '',
    createdAt: 'Created',
    lastSaved: 'Last saved',
    delete: 'Delete',
    addNew: '+ Add a new destination database',
    emptyTitle: 'No clipboards yet',
    emptyAction: 'Create new',
    emptyHint: 'No clipboards registered. You can add from existing databases below.',
    selectHint: 'No clipboards registered yet. Add one from the existing databases below.',
    availableTitle: 'Existing Notion databases',
    refresh: 'Refresh',
    refreshing: 'Loading...',
    availableHint: 'Shows databases from the linked account that are not registered yet.',
    noAvailable: 'No databases to show.',
    unregistered: 'Not registered',
    register: 'Register as destination',
    deleteConfirm: 'Delete this destination database?',
    updatedAt: 'Last updated',
    noClipboards: 'No clipboards registered yet.',
    tooltipExistingDatabases: 'Shows existing databases in your Notion workspace that are not yet registered as destinations'
  }
}

const ClipboardListScreen: FC<ClipboardListScreenProps> = ({
  clipboards,
  onNavigate,
  onDeleteClipboard,
  availableDatabases = [],
  onImportDatabase,
  onRefreshDatabases,
  isLoadingDatabases = false,
  databaseError,
  databaseInfoMessage,
  language
}) => {
  const t = translations[language]
  const locale = language === 'ja' ? 'ja-JP' : 'en-US'

  const handleClipboardClick = (clipboard: Clipboard) => {
    // Notionデータベースを新しいタブで開く
    if (clipboard.notionDatabaseUrl) {
      chrome.tabs.create({ url: clipboard.notionDatabaseUrl })
      requestUiClose()
    }
  }

  const handleDelete = (e: React.MouseEvent, clipboardId: string) => {
    e.stopPropagation()
    if (confirm(t.deleteConfirm)) {
      onDeleteClipboard?.(clipboardId)
    }
  }

  const formatDateTime = (value?: string) => {
    if (!value) return ''
    const date = new Date(value)
    if (isNaN(date.getTime())) {
      return value
    }
    return date.toLocaleString(locale)
  }

  const renderExcludedDatabases = () => (
    <div style={{ marginTop: '24px' }}>
      <div style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {t.availableTitle}
            <TooltipIcon text={t.tooltipExistingDatabases} style={{ marginLeft: 0 }} />
          </h2>
          <button
            className="button button-secondary"
            onClick={() => onRefreshDatabases?.()}
            disabled={isLoadingDatabases}
            style={{ padding: '4px 12px', fontSize: '12px', marginLeft: '8px', width: '80px' }}
          >
            {isLoadingDatabases ? t.refreshing : t.refresh}
          </button>
        </div>
        <p className="hint" style={{ marginTop: '4px', marginBottom: 0 }}>
          {t.availableHint.split('\n').map((line, idx) => (
            <React.Fragment key={idx}>
              {line}
              {idx === 0 && <br />}
            </React.Fragment>
          ))}
        </p>
      </div>
      {databaseError && (
        <div className="error-message" style={{ marginBottom: '8px' }}>
          {databaseError}
        </div>
      )}

      {databaseInfoMessage && (
        <div style={{
          marginBottom: '8px',
          padding: '12px',
          backgroundColor: '#e3f2fd',
          borderRadius: '4px',
          color: '#1976d2',
          fontSize: '13px'
        }}>
          {databaseInfoMessage}
        </div>
      )}

      {availableDatabases.length === 0 && !isLoadingDatabases ? (
        <div className="hint">
          {t.noAvailable}
        </div>
      ) : (
        availableDatabases.map((database) => (
          <div
            key={database.id}
            className="list-item"
            style={{ borderStyle: 'dashed' }}
          >
            <div className="list-item-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {database.iconEmoji && (
                <span style={{ fontSize: '18px' }}>{database.iconEmoji}</span>
              )}
              {database.title}
              <span style={{
                marginLeft: 'auto',
                padding: '2px 8px',
                fontSize: '11px',
                backgroundColor: '#fff3cd',
                color: '#856404',
                borderRadius: '4px',
                fontWeight: 'normal'
              }}>
                {t.unregistered}
              </span>
            </div>
            <div className="list-item-meta">
              {database.description && (
                <div style={{ marginBottom: '4px' }}>
                  {database.description}
                </div>
              )}
              {database.lastEditedTime && (
                <div style={{ marginBottom: '4px', color: '#666' }}>
                  {t.updatedAt}: {formatDateTime(database.lastEditedTime)}
                </div>
              )}
              <button
                onClick={() => onImportDatabase?.(database)}
                className="button"
                style={{
                  padding: '4px 10px',
                  fontSize: '12px'
                }}
              >
                {t.register}
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )

  const hasClipboards = clipboards.length > 0
  const hasAvailableDatabases = availableDatabases.length > 0
  const shouldShowAvailableSection = hasAvailableDatabases || !!databaseError || isLoadingDatabases

  return (
    <div className="container">
      <div className="header">
        <button className="back-button" onClick={() => onNavigate('home')}>
          {t.back}
        </button>
        <h1>{t.title}</h1>
      </div>

      {hasClipboards ? (
        <div>
          {clipboards.map((clipboard) => (
            <div
              key={clipboard.id}
              className="list-item"
              onClick={() => handleClipboardClick(clipboard)}
            >
              <div className="list-item-title">
                {clipboard.name}
                
              </div>
              <div className="list-item-meta">
                <div style={{ marginBottom: '4px' }}>
                  {t.createdAt}: {clipboard.createdAt instanceof Date
                    ? clipboard.createdAt.toLocaleDateString(locale)
                    : new Date(clipboard.createdAt).toLocaleDateString(locale)}
                </div>
                {clipboard.lastClippedAt && (
                  <div style={{ marginBottom: '4px' }}>
                    {t.lastSaved}: {clipboard.lastClippedAt instanceof Date
                      ? clipboard.lastClippedAt.toLocaleDateString(locale) + ' ' + clipboard.lastClippedAt.toLocaleTimeString(locale)
                      : new Date(clipboard.lastClippedAt).toLocaleDateString(locale) + ' ' + new Date(clipboard.lastClippedAt).toLocaleTimeString(locale)}
                  </div>
                )}
                {onDeleteClipboard && (
                  <button
                    onClick={(e) => handleDelete(e, clipboard.id)}
                    style={{
                      marginTop: '4px',
                      padding: '2px 8px',
                      fontSize: '12px',
                      color: '#dc3545',
                      background: 'none',
                      border: '1px solid #dc3545',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    {t.delete}
                  </button>
                )}
              </div>
            </div>
          ))}

          <button
            className="button button-secondary"
            onClick={() => onNavigate('create-clipboard')}
            style={{ marginTop: '16px' }}
          >
            {t.addNew}
          </button>
        </div>
      ) : hasAvailableDatabases ? (
        <div style={{ marginBottom: '16px' }}>
          <div className="hint" style={{ marginBottom: '12px' }}>
            {t.selectHint}
          </div>
          <button
            className="button button-secondary"
            onClick={() => onNavigate('create-clipboard')}
          >
            {t.addNew}
          </button>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-text">
            {t.emptyTitle}
          </div>
          <button
            className="button"
            onClick={() => onNavigate('create-clipboard')}
          >
            {t.emptyAction}
          </button>
        </div>
      )}

      {shouldShowAvailableSection && renderExcludedDatabases()}
    </div>
  )
}

export default ClipboardListScreen
