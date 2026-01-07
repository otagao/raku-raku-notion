import { type FC, useState, useRef, useEffect } from "react"

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
  const [tooltipPosition, setTooltipPosition] = useState<'right' | 'left'>('right')
  const iconRef = useRef<HTMLSpanElement>(null)
  const tooltipRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (showTooltip && iconRef.current && tooltipRef.current) {
      const iconRect = iconRef.current.getBoundingClientRect()
      const tooltipRect = tooltipRef.current.getBoundingClientRect()
      const viewportWidth = window.innerWidth

      // ツールチップが右端からはみ出る場合は左側に表示
      if (iconRect.right + tooltipRect.width > viewportWidth - 10) {
        setTooltipPosition('left')
      } else {
        setTooltipPosition('right')
      }
    }
  }, [showTooltip])

  return (
    <span
      ref={iconRef}
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
          ref={tooltipRef}
          style={{
            position: 'absolute',
            top: '50%',
            ...(tooltipPosition === 'right'
              ? { left: '24px' }
              : { right: '24px' }
            ),
            transform: 'translateY(-50%)',
            background: '#333',
            color: '#fff',
            padding: '6px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            zIndex: 10000,
            pointerEvents: 'none',
            maxWidth: '280px',
            whiteSpace: 'normal',
            wordBreak: 'break-word'
          }}
        >
          {text}
        </span>
      )}
    </span>
  )
}
