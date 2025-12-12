import React from "react";

interface ClippingProgressScreenProps {
  progressMessage: string;
}

const ClippingProgressScreen: React.FC<ClippingProgressScreenProps> = ({ progressMessage }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-4 bg-gray-50">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-4 text-lg font-semibold text-gray-700">
        進行中...
      </p>
      <p className="mt-2 text-sm text-gray-500">
        {progressMessage}
      </p>
    </div>
  );
};

export default ClippingProgressScreen;
