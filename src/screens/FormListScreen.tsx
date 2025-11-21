import type { FC } from "react"
import type { Form } from "~types"

interface FormListScreenProps {
  forms: Form[]
  onNavigate: (screen: string, formId?: string) => void
  allForms: Form[]
}

const FormListScreen: FC<FormListScreenProps> = ({ forms, onNavigate, allForms }) => {
  const handleFormClick = (formId: string) => {
    const form = allForms.find(f => f.id === formId)

    if (form?.targetUrl) {
      chrome.tabs.create({ url: form.targetUrl })
      window.close()
    } else {
      onNavigate('demo', formId)
    }
  }

  return (
    <div className="container">
      <div className="header">
        <button className="back-button" onClick={() => onNavigate('home')}>
          ← 戻る
        </button>
        <h1>フォーム一覧</h1>
      </div>

      {forms.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-text">
            フォームがまだありません
          </div>
          <button
            className="button"
            onClick={() => onNavigate('create-form')}
          >
            Add New Form
          </button>
        </div>
      ) : (
        <div>
          {forms.map((form) => (
            <div
              key={form.id}
              className="list-item"
              onClick={() => handleFormClick(form.id)}
            >
              <div className="list-item-title">
                {form.name}
                {form.isMock && (
                  <span style={{
                    marginLeft: '8px',
                    padding: '2px 8px',
                    fontSize: '11px',
                    backgroundColor: '#e9e9e7',
                    color: '#787774',
                    borderRadius: '4px',
                    fontWeight: 'normal'
                  }}>
                    DEMO
                  </span>
                )}
              </div>
              <div className="list-item-meta">
                作成日: {new Date(form.createdAt).toLocaleDateString('ja-JP')}
                {form.targetUrl && (
                  <span style={{ marginLeft: '8px' }}>
                    → {form.targetUrl}
                  </span>
                )}
              </div>
            </div>
          ))}

          <button
            className="button button-secondary"
            onClick={() => onNavigate('create-form')}
            style={{ marginTop: '16px' }}
          >
            + 新しいフォームを追加
          </button>
        </div>
      )}
    </div>
  )
}

export default FormListScreen
