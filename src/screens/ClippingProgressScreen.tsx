import React from "react";

interface ClippingProgressScreenProps {
  progressMessage: string;
}

const ClippingProgressScreen: React.FC<ClippingProgressScreenProps> = ({ progressMessage }) => {
  return (
    <div className="container" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '400px',
      padding: '40px 20px'
    }}>
      <div className="spinner" style={{
        width: '48px',
        height: '48px',
        border: '4px solid #e0e0e0',
        borderTop: '4px solid #0066cc',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }}></div>
      <p style={{
        marginTop: '24px',
        fontSize: '18px',
        fontWeight: '600',
        color: '#333'
      }}>
        進行中...
      </p>
      <p style={{
        marginTop: '12px',
        fontSize: '14px',
        color: '#666'
      }}>
        {progressMessage}
      </p>
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
