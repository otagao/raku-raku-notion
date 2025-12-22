import { useState, type FC } from "react"

interface CreateClipboardScreenProps {
  onNavigate: (screen: string) => void
  onCreateClipboard: (clipboardName: string) => void
  countdown: number
}

const CreateClipboardScreen: FC<CreateClipboardScreenProps> = ({
  onNavigate,
  onCreateClipboard,
  countdown
}) => {
  const [clipboardName, setClipboardName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clipboardName.trim()) return

    setIsCreating(true)
    setError("")

    try {
      await onCreateClipboard(clipboardName)
      onNavigate('clipboard-list')
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存先データベースの作成に失敗しました')
      setIsCreating(false)
    }
  }

  return (
    <div className="container">
      <div className="header">
        <button className="back-button" onClick={() => onNavigate('home')}>
          ← 戻る
        </button>
        <h1>新規保存先データベース作成</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="clipboard-name">保存先データベース名</label>
          <input
            id="clipboard-name"
            type="text"
            className="input"
            placeholder="例: 記事クリップ、参考リンクなど"
            value={clipboardName}
            onChange={(e) => setClipboardName(e.target.value)}
            autoFocus
            disabled={isCreating}
          />
          <p className="hint">
            Notionに新しいデータベースを作成します
          </p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="button"
          disabled={!clipboardName.trim() || isCreating}
        >
          {isCreating ? '新規データベース作成中...' : '保存先データベースを作成'}
        </button>
        {isCreating && (
          <p style={{ color: '#d9534f', fontSize: '12px', marginTop: '10px', textAlign: 'center', fontWeight: 'bold' }}>
            完了するまで、この画面を閉じたり別のタブに移動したりしないでください。
          </p>
        )}
      </form>
    </div>
  )
}

export default CreateClipboardScreen
