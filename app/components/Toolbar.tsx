'use client';

interface ToolbarProps {
  envelopeMode: boolean;
  onToggleEnvelope: () => void;
}

export default function Toolbar({ envelopeMode, onToggleEnvelope }: ToolbarProps) {
  return (
    <div className="h-[50px] bg-[#2a2a2a] border-b border-[#3a3a3a] flex items-center px-4 gap-2">
      <button
        onClick={onToggleEnvelope}
        className={`flex items-center gap-2 px-4 py-2 rounded border transition-all ${
          envelopeMode
            ? 'bg-[#4a7a9a] border-[#5a8aba] text-white'
            : 'bg-[#3a3a3a] border-[#4a4a4a] text-[#ccc] hover:bg-[#4a4a4a] hover:border-[#5a5a5a]'
        }`}
      >
        <i className="fas fa-wave-square text-base"></i>
        <span className="text-sm">Clip Envelopes</span>
      </button>
    </div>
  );
}
