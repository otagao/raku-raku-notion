import { useState, type FC } from "react"
import type { Language } from "~types"

interface CreateClipboardScreenProps {
  onNavigate: (screen: string) => void
  onCreateClipboard: (clipboardName: string) => void
  language: Language
  countdown: number
}

const CreateClipboardScreen: FC<CreateClipboardScreenProps> = ({
  onNavigate,
  onCreateClipboard,
  language,
  countdown
}) => {
  const [clipboardName, setClipboardName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState("")

  const t = {
    ja: {
      title: "新規保存先データベース作成",
      label: "保存先データベース名",
      placeholder: "例: 記事クリップ、参考リンクなど",
      hint: "Notionに新しいデータベースを作成します",
      submit: isCreating ? "作成中..." : "保存先データベースを作成",
      back: "← 戻る"
    },
    en: {
      title: "Create Destination Database",
      label: "Destination database name",
      placeholder: "e.g. Article clips, Reference links",
      hint: "Create a new database in Notion",
      submit: isCreating ? "Creating..." : "Create destination database",
      back: "← Back"
    }
  }[language]

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
          {t.back}
        </button>
        <h1>{t.title}</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="clipboard-name">{t.label}</label>
          <input
            id="clipboard-name"
            type="text"
            className="input"
            placeholder={t.placeholder}
            value={clipboardName}
            onChange={(e) => setClipboardName(e.target.value)}
            autoFocus
            disabled={isCreating}
          />
          <p className="hint">
            {t.hint}
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
          {t.submit}
        </button>
        {isCreating && (
          <>
            <p style={{ color: '#d9534f', fontSize: '12px', marginTop: '10px', textAlign: 'center', fontWeight: 'bold' }}>
              完了するまで、この画面を閉じたり別のタブに移動したりしないでください。
            </p>
            {countdown > 0 && (
              <p style={{ color: '#666', fontSize: '12px', marginTop: '5px', textAlign: 'center' }}>
                {language === 'ja'
                  ? `データベースの権限設定を待機中... (残り ${countdown}秒)`
                  : `Waiting for database permissions... (${countdown}s remaining)`
                }
              </p>
            )}
          </>
        )}
      </form>
    </div>
  )
}

export default CreateClipboardScreen
