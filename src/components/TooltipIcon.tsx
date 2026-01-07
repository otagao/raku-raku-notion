import { type FC, useState } from "react"

interface TooltipIconProps {
  /** ツールチップに表示するテキスト */
  text: string
  /** アイコンの表示位置調整（デフォルト: margin-left: 4px） */
  style?: React.CSSProperties
}

/**
 * ホバー時に説明文を表示するアイコンコンポーネント
 */
export const TooltipIcon: FC<TooltipIconProps> = ({ text, style = {} }) => {
  const [showTooltip, setShowTooltip] = useState<boolean>(false)

  return (
    <span
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '16px',
        height: '16px',
        border: '1px solid #bbb',
        borderRadius: '50%',
        fontSize: '11px',
        color: '#666',
        cursor: 'help',
        userSelect: 'none',
        marginLeft: '4px',
        ...style
      }}
    >
      i
      {showTooltip && (
        <span
          style={{
            position: 'absolute',
            top: '50%',
            left: '24px',
            transform: 'translateY(-50%)',
            background: '#333',
            color: '#fff',
            padding: '6px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            whiteSpace: 'nowrap',
            zIndex: 10,
            pointerEvents: 'none'
          }}
        >
          {text}
        </span>
      )}
    </span>
  )
}
