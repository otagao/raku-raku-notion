import type { FC } from "react"

interface DemoScreenProps {
  formId?: string
  onNavigate: (screen: string) => void
}

const DemoScreen: FC<DemoScreenProps> = ({ formId, onNavigate }) => {
  return (
    <div className="container">
      <div className="header">
        <button className="back-button" onClick={() => onNavigate('form-list')}>
          ← フォーム一覧へ
        </button>
        <h1>デモページ</h1>
      </div>

      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div className="empty-state-icon">🚀</div>
        <p style={{ marginTop: '16px', color: '#787774' }}>
          フォームID: {formId}
        </p>
        <p style={{ marginTop: '8px', color: '#787774' }}>
          このページは今後、Notionへの保存機能を実装する予定です。
        </p>
      </div>
    </div>
  )
}

export default DemoScreen
