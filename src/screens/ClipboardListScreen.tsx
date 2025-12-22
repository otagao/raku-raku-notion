import type { FC } from "react"
import type { Clipboard, NotionDatabaseSummary } from "~types"

interface ClipboardListScreenProps {
  clipboards: Clipboard[]
  onNavigate: (screen: string, clipboardId?: string) => void
  onDeleteClipboard?: (clipboardId: string) => void
  availableDatabases?: NotionDatabaseSummary[]
  onImportDatabase?: (database: NotionDatabaseSummary) => void
  onRefreshDatabases?: () => void
  isLoadingDatabases?: boolean
  databaseError?: string | null
}

const ClipboardListScreen: FC<ClipboardListScreenProps> = ({
  clipboards,
  onNavigate,
  onDeleteClipboard,
  availableDatabases = [],
  onImportDatabase,
  onRefreshDatabases,
  isLoadingDatabases = false,
  databaseError
}) => {
  const handleClipboardClick = (clipboard: Clipboard) => {
    // Notionデータベースを新しいタブで開く
    if (clipboard.notionDatabaseUrl) {
      chrome.tabs.create({ url: clipboard.notionDatabaseUrl })
      window.close()
    }
  }

  const handleDelete = (e: React.MouseEvent, clipboardId: string) => {
    e.stopPropagation()
    if (confirm('この保存先データベースを保存先リストから除外しますか？')) {
      onDeleteClipboard?.(clipboardId)
    }
  }

  const formatDateTime = (value?: string) => {
    if (!value) return ''
    const date = new Date(value)
    if (isNaN(date.getTime())) {
      return value
    }
    return date.toLocaleString('ja-JP')
  }

  const renderExcludedDatabases = () => (
    <div style={{ marginTop: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '16px' }}>保存先リストから除外されたデータベース</h2>
        <button
          className="button button-secondary"
          onClick={() => onRefreshDatabases?.()}
          disabled={isLoadingDatabases}
          style={{ padding: '4px 12px', fontSize: '12px' }}
        >
          {isLoadingDatabases ? '取得中...' : '最新情報に更新'}
        </button>
      </div>
      <p className="hint" style={{ marginTop: '4px' }}>
        連携済みアカウントから、保存先リストに登録されていないデータベースを表示します。
      </p>
      {databaseError && (
        <div className="error-message" style={{ marginBottom: '8px' }}>
          {databaseError}
        </div>
      )}

      {availableDatabases.length === 0 && !isLoadingDatabases ? (
        <div className="hint">
          表示できるデータベースはありません。
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
                未登録
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
                  最終更新: {formatDateTime(database.lastEditedTime)}
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
                保存先データベースとして登録
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
          ← 戻る
        </button>
        <h1>保存先データベース一覧</h1>
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
                {clipboard.createdByExtension && (
                  <span style={{
                    marginLeft: '8px',
                    padding: '2px 8px',
                    fontSize: '11px',
                    backgroundColor: '#e3f2fd',
                    color: '#1976d2',
                    borderRadius: '4px',
                    fontWeight: 'normal'
                  }}>
                    拡張機能作成
                  </span>
                )}
              </div>
              <div className="list-item-meta">
                <div style={{ marginBottom: '4px' }}>
                  作成日: {clipboard.createdAt instanceof Date
                    ? clipboard.createdAt.toLocaleDateString('ja-JP')
                    : new Date(clipboard.createdAt).toLocaleDateString('ja-JP')}
                </div>
                {clipboard.lastClippedAt && (
                  <div style={{ marginBottom: '4px' }}>
                    最終保存日時: {clipboard.lastClippedAt instanceof Date
                      ? clipboard.lastClippedAt.toLocaleDateString('ja-JP') + ' ' + clipboard.lastClippedAt.toLocaleTimeString('ja-JP')
                      : new Date(clipboard.lastClippedAt).toLocaleDateString('ja-JP') + ' ' + new Date(clipboard.lastClippedAt).toLocaleTimeString('ja-JP')}
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
                    保存先リストから除外
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
            + 新しい保存先データベースを追加
          </button>
        </div>
      ) : hasAvailableDatabases ? (
        <div className="hint" style={{ marginBottom: '16px' }}>
          まだ登録されたクリップボードはありません。下の除外されたデータベースから追加できます。
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-text">
            クリップボードがまだありません
          </div>
          <button
            className="button"
            onClick={() => onNavigate('create-clipboard')}
          >
            新規作成
          </button>
        </div>
      )}

      {shouldShowAvailableSection && renderExcludedDatabases()}
    </div>
  )
}

export default ClipboardListScreen
