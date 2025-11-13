'use client';

interface TrackHeaderProps {
  trackName: string;
}

export default function TrackHeader({ trackName }: TrackHeaderProps) {
  return (
    <div className="h-[150px] p-2 border-b border-[#3a3a3a] flex flex-col">
      <h3 className="text-sm font-medium mb-2 text-white">{trackName}</h3>
      <div className="flex gap-2 mt-auto">
        <button className="px-2 py-1 text-xs bg-[#3a3a3a] border border-[#4a4a4a] text-[#ccc] rounded hover:bg-[#4a4a4a]">
          M
        </button>
        <button className="px-2 py-1 text-xs bg-[#3a3a3a] border border-[#4a4a4a] text-[#ccc] rounded hover:bg-[#4a4a4a]">
          S
        </button>
      </div>
    </div>
  );
}
