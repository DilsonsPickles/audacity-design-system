'use client';

export default function Ruler() {
  const labels = [
    { label: '+1.0', pos: '0%' },
    { label: '+0.5', pos: '25%' },
    { label: '0.0', pos: '50%' },
    { label: '-0.5', pos: '75%' },
    { label: '-1.0', pos: '100%' },
  ];

  return (
    <div className="h-[150px] border-b border-l border-[#3a3a3a] relative">
      {labels.map(({ label, pos }) => (
        <div key={label}>
          <div
            className="absolute left-[5px] w-[10px] h-[1px] bg-[#555]"
            style={{ top: pos }}
          />
          <div
            className="absolute right-[5px] text-[10px] font-mono text-[#aaa]"
            style={{ top: `calc(${pos} - 5px)` }}
          >
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}
