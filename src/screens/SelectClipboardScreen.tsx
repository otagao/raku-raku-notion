import type { FC } from "react"
import type { Clipboard } from "~types"

interface SelectClipboardScreenProps {
  clipboards: Clipboard[]
  onNavigate: (screen: string) => void
  onSelectClipboard: (databaseId: string) => void
}

const SelectClipboardScreen: FC<SelectClipboardScreenProps> = ({
  clipboards,
  onNavigate,
  onSelectClipboard
}) => {
  return (
    <div className="container">
      <div className="header">
        <button className="back-button" onClick={() => onNavigate('home')}>
          ← キャンセル
        </button>
        <h1>クリップ先を選択</h1>
      </div>

      {clipboards.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-text">
            保存先データベースがまだありません
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
          <p style={{
            marginBottom: '16px',
            color: '#666',
            fontSize: '14px'
          }}>
            このページを保存する保存先データベースを選択してください
          </p>

          {clipboards.map((clipboard) => (
            <div
              key={clipboard.id}
              className="list-item"
              onClick={() => onSelectClipboard(clipboard.notionDatabaseId)}
              style={{ cursor: 'pointer' }}
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
      )}
    </div>
  )
}

export default SelectClipboardScreen
