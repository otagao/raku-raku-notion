import { type FC, useState, useRef, useEffect, type KeyboardEvent } from "react"

interface MemoDialogProps {
  onConfirm: (memo: string) => void
  onCancel: () => void
  clipboardName?: string
}

const MemoDialog: FC<MemoDialogProps> = ({ onConfirm, onCancel, clipboardName }) => {
  const [memo, setMemo] = useState("")
  const [isComposing, setIsComposing] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    // ダイアログが開いたらテキストエリアにフォーカス
    textareaRef.current?.focus()
  }, [])

  const handleCompositionStart = () => {
    setIsComposing(true)
  }

  const handleCompositionEnd = () => {
    setIsComposing(false)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // IME変換中はEnterを無視
    if (isComposing) {
      return
    }

    // Enterキー（Shiftなし）で確定
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onConfirm(memo)
    }
    // Escapeキーでキャンセル
    if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '20px',
        width: '90%',
        maxWidth: '400px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
      }}>
        <h3 style={{
          margin: '0 0 12px 0',
          fontSize: '16px',
          fontWeight: '600'
        }}>
          メモを追加（任意）
        </h3>

        {clipboardName && (
          <div style={{
            marginBottom: '12px',
            padding: '8px 12px',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px',
            fontSize: '14px',
            color: '#333'
          }}>
            <span style={{ color: '#666', fontSize: '12px' }}>クリップ先:</span>
            <span style={{ marginLeft: '8px', fontWeight: '500' }}>
              📋 {clipboardName}
            </span>
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          placeholder="このクリップにメモを追加できます..."
          style={{
            width: '100%',
            minHeight: '100px',
            padding: '8px',
            border: '1px solid #e0e0e0',
            borderRadius: '4px',
            fontSize: '14px',
            fontFamily: 'inherit',
            resize: 'vertical',
            boxSizing: 'border-box'
          }}
        />

        <div style={{
          fontSize: '12px',
          color: '#666',
          marginTop: '8px',
          marginBottom: '16px'
        }}>
          💡 Shift + Enter で改行、Enter で確定
        </div>

        <div style={{
          display: 'flex',
          gap: '8px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onCancel}
            className="button button-secondary"
            style={{ margin: 0 }}
          >
            キャンセル
          </button>
          <button
            onClick={() => onConfirm(memo)}
            className="button"
            style={{ margin: 0 }}
          >
            クリップする
          </button>
        </div>
      </div>
    </div>
  )
}

export default MemoDialog
