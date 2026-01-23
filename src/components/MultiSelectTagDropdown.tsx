import React, { useState, useEffect } from "react"

interface MultiSelectTagDropdownProps {
  existingTags?: string[]
  selectedTags: string[]
  onToggleTag: (tag: string) => void
  onAddNewTag: (tag: string) => void
  language: 'ja' | 'en'
}

export const MultiSelectTagDropdown: React.FC<MultiSelectTagDropdownProps> = ({
  existingTags = [],
  selectedTags,
  onToggleTag,
  onAddNewTag,
  language
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const [newTagInput, setNewTagInput] = useState<string>('')

  // 翻訳テキスト
  const translations = {
    ja: {
      placeholder: 'タグを選択',
      selected: (count: number) => `${count}個のタグを選択中`,
      newPlaceholder: '新規タグを入力',
      addButton: '追加'
    },
    en: {
      placeholder: 'Select tags',
      selected: (count: number) => `${count} tag${count !== 1 ? 's' : ''} selected`,
      newPlaceholder: 'Enter new tag',
      addButton: 'Add'
    }
  }

  const t = translations[language]

  // ドロップダウンの開閉トグル
  const toggleDropdown = () => {
    setIsOpen(prev => !prev)
  }

  // チェックボックスのトグル
  const handleToggleTag = (tag: string) => {
    onToggleTag(tag)
  }

  // 新規タグの追加
  const handleAddNewTag = () => {
    const trimmed = newTagInput.trim()
    if (trimmed) {
      onAddNewTag(trimmed)
      setNewTagInput('')
    }
  }

  // Enterキーで新規タグを追加
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddNewTag()
    }
  }

  // 外部クリック検知でドロップダウンを閉じる
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.tag-dropdown-container')) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const selectedCount = selectedTags.length

  return (
    <div className="tag-dropdown-container">
      {/* ドロップダウンボタン */}
      <button
        className="tag-dropdown-button"
        onClick={toggleDropdown}
        aria-expanded={isOpen}
        type="button"
      >
        <span>
          {selectedCount === 0 ? t.placeholder : t.selected(selectedCount)}
        </span>
        <span className="dropdown-arrow">▼</span>
      </button>

      {/* ドロップダウンメニュー */}
      {isOpen && (
        <div className="tag-dropdown-menu">
          {/* 既存タグリスト */}
          <div className="tag-options-list">
            {existingTags.length === 0 ? (
              <div style={{ padding: '12px', textAlign: 'center', color: '#999', fontSize: '13px' }}>
                {language === 'ja' ? 'タグがありません' : 'No tags available'}
              </div>
            ) : (
              existingTags.map((tag) => (
                <label key={tag} className="tag-option-item">
                  <input
                    type="checkbox"
                    checked={selectedTags.includes(tag)}
                    onChange={() => handleToggleTag(tag)}
                  />
                  <span className="tag-option-label">{tag}</span>
                </label>
              ))
            )}
          </div>

          {/* 新規タグ入力セクション */}
          <div className="tag-new-section">
            <div className="tag-new-input-wrapper">
              <input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t.newPlaceholder}
                className="tag-new-input"
              />
              <button
                onClick={handleAddNewTag}
                disabled={!newTagInput.trim()}
                className="tag-new-button"
                type="button"
              >
                {t.addButton}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
