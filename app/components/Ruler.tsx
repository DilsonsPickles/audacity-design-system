'use client';

interface RulerProps {
  isFocused?: boolean;
  onClick?: () => void;
}

export default function Ruler({ isFocused = false, onClick }: RulerProps) {
  const labels = [
    { label: '+1.0', pos: '0%' },
    { label: '+0.5', pos: '25%' },
    { label: '0.0', pos: '50%' },
    { label: '-0.5', pos: '75%' },
    { label: '-1.0', pos: '100%' },
  ];

  return (
    <div className="mt-[2px] mb-[2px] relative">
      {/* Focus border in the gap */}
      {isFocused && (
        <>
          <div className="absolute -top-[2px] left-0 right-0 h-[2px] bg-[#84B5FF]" />
          <div className="absolute -bottom-[2px] left-0 right-0 h-[2px] bg-[#84B5FF]" />
          <div className="absolute top-0 -right-0 bottom-0 w-[2px] bg-[#84B5FF]" />
        </>
      )}

      <div
        className="h-[114px] border-l border-[#3a3a3a] relative cursor-pointer"
        onClick={onClick}
      >
      {/* 20px spacer for clip header */}
      <div
        className="absolute top-0 left-0 right-0 h-[20px]"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
      />

      {/* Offset labels by 20px to account for header */}
      {labels.map(({ label, pos }) => (
        <div key={label}>
          <div
            className="absolute left-[5px] w-[10px] h-[1px] bg-[#555]"
            style={{ top: `calc(20px + (100% - 20px) * ${parseFloat(pos) / 100})` }}
          />
          <div
            className="absolute right-[5px] text-[10px] font-mono text-[#aaa]"
            style={{ top: `calc(20px + (100% - 20px) * ${parseFloat(pos) / 100} - 5px)` }}
          >
            {label}
          </div>
        </div>
      ))}
      </div>
    </div>
  );
}
