import type { FC } from "react"

interface HomeScreenProps {
  onNavigate: (screen: string) => void
}

const HomeScreen: FC<HomeScreenProps> = ({ onNavigate }) => {
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
          フォームを作成してNotionへの保存を簡単に
        </div>
        <button
          className="button"
          onClick={() => onNavigate('form-list')}
        >
          フォーム一覧を見る
        </button>
        <button
          className="button button-secondary"
          onClick={() => onNavigate('create-form')}
          style={{ marginTop: '12px' }}
        >
          + 新しいフォームを作成
        </button>
      </div>
    </div>
  )
}

export default HomeScreen
