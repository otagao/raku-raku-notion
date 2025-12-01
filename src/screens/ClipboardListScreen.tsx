import type { FC } from "react"
import type { Clipboard } from "~types"

interface ClipboardListScreenProps {
  clipboards: Clipboard[]
  onNavigate: (screen: string, clipboardId?: string) => void
  onDeleteClipboard?: (clipboardId: string) => void
}

const ClipboardListScreen: FC<ClipboardListScreenProps> = ({
  clipboards,
  onNavigate,
  onDeleteClipboard
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
    if (confirm('このクリップボードを削除しますか？')) {
      onDeleteClipboard?.(clipboardId)
    }
  }

  return (
    <div className="container">
      <div className="header">
        <button className="back-button" onClick={() => onNavigate('home')}>
          ← 戻る
        </button>
        <h1>クリップボード一覧</h1>
      </div>

      {clipboards.length === 0 ? (
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
      ) : (
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
                    最終クリップ: {clipboard.lastClippedAt instanceof Date
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
                    削除
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
            + 新しいクリップボードを追加
          </button>
        </div>
      )}
    </div>
  )
}

export default ClipboardListScreen
