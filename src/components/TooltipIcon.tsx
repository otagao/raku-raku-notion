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
  const [maxWidth, setMaxWidth] = useState<number>(280)
  const [tooltipVertical, setTooltipVertical] = useState<'center' | 'above' | 'below'>('center')
  const iconRef = useRef<HTMLSpanElement>(null)
  const tooltipRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (showTooltip && iconRef.current) {
      const iconRect = iconRef.current.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      // 利用可能なスペースを計算
      const spaceOnRight = viewportWidth - iconRect.right - 24 - 10 // 24pxはアイコンとの距離、10pxはマージン
      const spaceOnLeft = iconRect.left - 24 - 10

      // より広いスペースがある方向に表示
      if (spaceOnLeft > spaceOnRight) {
        setTooltipPosition('left')
        setMaxWidth(Math.min(280, Math.max(150, spaceOnLeft)))
      } else {
        setTooltipPosition('right')
        setMaxWidth(Math.min(280, Math.max(150, spaceOnRight)))
      }

      requestAnimationFrame(() => {
        const tooltipEl = tooltipRef.current
        if (!tooltipEl) return
        const tooltipHeight = tooltipEl.getBoundingClientRect().height
        const topWouldOverflow = iconRect.top - tooltipHeight / 2 < 8
        const bottomWouldOverflow = iconRect.bottom + tooltipHeight / 2 > viewportHeight - 8
        if (topWouldOverflow && !bottomWouldOverflow) {
          setTooltipVertical('below')
        } else if (bottomWouldOverflow && !topWouldOverflow) {
          setTooltipVertical('above')
        } else {
          setTooltipVertical('center')
        }
      })
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
            ...(tooltipVertical === 'center'
              ? { top: '50%', transform: 'translateY(-50%)' }
              : tooltipVertical === 'above'
                ? { bottom: '100%', marginBottom: '8px' }
                : { top: '100%', marginTop: '8px' }
            ),
            ...(tooltipPosition === 'right'
              ? { left: '24px' }
              : { right: '24px' }
            ),
            background: '#333',
            color: '#fff',
            padding: '6px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            lineHeight: '1.4',
            zIndex: 10000,
            pointerEvents: 'none',
            maxWidth: `${maxWidth}px`,
            minWidth: '100px',
            whiteSpace: 'normal',
            wordBreak: 'break-word',
            overflowWrap: 'break-word'
          }}
        >
          {text}
        </span>
      )}
    </span>
  )
}
