import { useState, type FC } from "react"

interface CreateFormScreenProps {
  onNavigate: (screen: string) => void
  onCreateForm: (formName: string) => void
}

const CreateFormScreen: FC<CreateFormScreenProps> = ({ onNavigate, onCreateForm }) => {
  const [formName, setFormName] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formName.trim()) {
      onCreateForm(formName)
      onNavigate('form-list')
    }
  }

  return (
    <div className="container">
      <div className="header">
        <button className="back-button" onClick={() => onNavigate('home')}>
          ← 戻る
        </button>
        <h1>新規フォーム作成</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="form-name">フォーム名</label>
          <input
            id="form-name"
            type="text"
            className="input"
            placeholder="例: ウェブクリップ、記事保存など"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            autoFocus
          />
        </div>

        <button
          type="submit"
          className="button"
          disabled={!formName.trim()}
        >
          フォームを作成
        </button>
      </form>
    </div>
  )
}

export default CreateFormScreen
