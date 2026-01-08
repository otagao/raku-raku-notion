import type { FC } from "react"
import type { Clipboard, Language } from "~types"

interface SelectClipboardScreenProps {
  clipboards: Clipboard[]
  onNavigate: (screen: string) => void
  onSelectClipboard: (databaseId: string) => void
  language: Language
}

const translations: Record<Language, {
  cancel: string
  title: string
  emptyTitle: string
  createNew: string
  instruction: string
  createdByExtension: string
  createdAt: string
  lastSaved: string
  addNew: string
}> = {
  ja: {
    cancel: '← キャンセル',
    title: 'クリップ先を選択',
    emptyTitle: '保存先データベースがまだありません',
    createNew: '新規作成',
    instruction: 'このページを保存する保存先データベースを選択してください',
    createdByExtension: '拡張機能作成',
    createdAt: '作成日',
    lastSaved: '最終保存日時',
    addNew: '+ 新しい保存先データベースを追加'
  },
  en: {
    cancel: '← Cancel',
    title: 'Select destination',
    emptyTitle: 'No destination databases yet',
    createNew: 'Create new',
    instruction: 'Select a destination database to save this page',
    createdByExtension: '',
    createdAt: 'Created',
    lastSaved: 'Last saved',
    addNew: '+ Add a new destination database'
  }
}

const SelectClipboardScreen: FC<SelectClipboardScreenProps> = ({
  clipboards,
  onNavigate,
  onSelectClipboard,
  language
}) => {
  const t = translations[language]
  const locale = language === 'ja' ? 'ja-JP' : 'en-US'

  return (
    <div className="container">
      <div className="header">
        <button className="back-button" onClick={() => onNavigate('home')}>
          {t.cancel}
        </button>
        <h1>{t.title}</h1>
      </div>

      {clipboards.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-text">
            {t.emptyTitle}
          </div>
          <button
            className="button"
            onClick={() => onNavigate('create-clipboard')}
          >
            {t.createNew}
          </button>
        </div>
      ) : (
        <div>
          <p style={{
            marginBottom: '16px',
            color: '#666',
            fontSize: '14px'
          }}>
            {t.instruction}
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
                
              </div>
              <div className="list-item-meta">
                <div style={{ marginBottom: '4px' }}>
                  {t.createdAt}: {clipboard.createdAt instanceof Date
                    ? clipboard.createdAt.toLocaleDateString(locale)
                    : new Date(clipboard.createdAt).toLocaleDateString(locale)}
                </div>
                {clipboard.lastClippedAt && (
                  <div style={{ marginBottom: '4px' }}>
                    {t.lastSaved}: {clipboard.lastClippedAt instanceof Date
                      ? clipboard.lastClippedAt.toLocaleDateString(locale) + ' ' + clipboard.lastClippedAt.toLocaleTimeString(locale)
                      : new Date(clipboard.lastClippedAt).toLocaleDateString(locale) + ' ' + new Date(clipboard.lastClippedAt).toLocaleTimeString(locale)}
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
            {t.addNew}
          </button>
        </div>
      )}
    </div>
  )
}

export default SelectClipboardScreen
