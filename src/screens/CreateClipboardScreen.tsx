import { useState, type FC } from "react"

interface CreateClipboardScreenProps {
  onNavigate: (screen: string) => void
  onCreateClipboard: (clipboardName: string) => void
}

const CreateClipboardScreen: FC<CreateClipboardScreenProps> = ({
  onNavigate,
  onCreateClipboard
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
      setError(err instanceof Error ? err.message : 'クリップボードの作成に失敗しました')
      setIsCreating(false)
    }
  }

  return (
    <div className="container">
      <div className="header">
        <button className="back-button" onClick={() => onNavigate('home')}>
          ← 戻る
        </button>
        <h1>新規クリップボード作成</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="clipboard-name">クリップボード名</label>
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
          {isCreating ? '作成中...' : 'クリップボードを作成'}
        </button>
      </form>
    </div>
  )
}

export default CreateClipboardScreen
