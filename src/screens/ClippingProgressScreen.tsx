import React from "react";

interface ClippingProgressScreenProps {
  progressMessage: string;
  showOpenInNotion?: boolean;
  openInNotionUrl?: string;
  hideOpenInNotionChecked?: boolean;
  onToggleHideOpenInNotion?: (checked: boolean) => void;
  onOpenInNotion?: () => void;
  onDismiss?: () => void;
}

const ClippingProgressScreen: React.FC<ClippingProgressScreenProps> = ({
  progressMessage,
  showOpenInNotion = false,
  openInNotionUrl,
  hideOpenInNotionChecked = false,
  onToggleHideOpenInNotion,
  onOpenInNotion,
  onDismiss
}) => {
  return (
    <div className="container" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: showOpenInNotion ? '240px' : '320px',
      padding: '20px 16px'
    }}>
      {!showOpenInNotion && (
        <div className="spinner" style={{
          width: '48px',
          height: '48px',
          border: '4px solid #e0e0e0',
          borderTop: '4px solid #0066cc',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
      )}
      <p style={{
        marginTop: '16px',
        fontSize: '18px',
        fontWeight: '600',
        color: '#333'
      }}>
        {showOpenInNotion ? '保存しました' : '進行中...'}
      </p>
      <p style={{
        marginTop: '10px',
        fontSize: '14px',
        color: '#666'
      }}>
        {progressMessage}
      </p>
      {showOpenInNotion && openInNotionUrl && (
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <button
            className="button button-primary"
            onClick={onOpenInNotion}
            style={{ padding: '8px 16px', fontSize: '14px' }}
          >
            Open in Notion
          </button>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#666' }}>
            <input
              type="checkbox"
              checked={hideOpenInNotionChecked}
              onChange={(e) => onToggleHideOpenInNotion?.(e.target.checked)}
            />
            今後表示しない
          </label>
          {onDismiss && (
            <button
              className="button button-secondary"
              onClick={onDismiss}
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              閉じる
            </button>
          )}
        </div>
      )}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ClippingProgressScreen;
