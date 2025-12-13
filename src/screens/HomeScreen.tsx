import type { FC } from "react"

interface HomeScreenProps {
  onNavigate: (screen: string) => void
  onClipPage?: () => void
}

const HomeScreen: FC<HomeScreenProps> = ({ onNavigate, onClipPage }) => {
  return (
    <div className="container">
      <div className="header">
        <h1>Raku Raku Notion</h1>
        <button
          onClick={() => onNavigate('settings')}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'transparent',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '4px 8px'
          }}
          title="設定"
        >
          ⚙️
        </button>
      </div>

      <div className="empty-state">
        <div className="empty-state-icon">📝</div>
        <div className="empty-state-text">
          ウェブページをNotionに簡単保存
        </div>

        <button
          className="button"
          onClick={onClipPage}
          style={{ marginTop: '12px' }}
        >
          📎 このページをクリップ
        </button>

        <div style={{
          marginTop: '24px',
          paddingTop: '24px',
          borderTop: '1px solid #e9e9e7'
        }}>
          <button
            className="button button-secondary"
            onClick={() => onNavigate('clipboard-list')}
          >
            保存先データベース一覧を見る
          </button>
          <button
            className="button button-secondary"
            onClick={() => onNavigate('create-clipboard')}
            style={{ marginTop: '12px' }}
          >
            + 新しい保存先データベースを作成
          </button>
        </div>
      </div>
    </div>
  )
}

export default HomeScreen
