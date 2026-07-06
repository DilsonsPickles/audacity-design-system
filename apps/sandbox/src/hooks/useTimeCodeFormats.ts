import { useState } from 'react';
import type { TimeCodeFormat } from '@dilsonspickles/components';

export interface UseTimeCodeFormatsReturn {
  timeCodeFormat: TimeCodeFormat;
  setTimeCodeFormat: React.Dispatch<React.SetStateAction<TimeCodeFormat>>;
  selectionTimeCodeFormat: TimeCodeFormat;
  setSelectionTimeCodeFormat: React.Dispatch<React.SetStateAction<TimeCodeFormat>>;
  durationTimeCodeFormat: TimeCodeFormat;
  setDurationTimeCodeFormat: React.Dispatch<React.SetStateAction<TimeCodeFormat>>;
}

export function useTimeCodeFormats(): UseTimeCodeFormatsReturn {
  const [timeCodeFormat, setTimeCodeFormat] = useState<TimeCodeFormat>('hh:mm:ss');
  const [selectionTimeCodeFormat, setSelectionTimeCodeFormat] = useState<TimeCodeFormat>('hh:mm:ss');
  const [durationTimeCodeFormat, setDurationTimeCodeFormat] = useState<TimeCodeFormat>('hh:mm:ss');

  return {
    timeCodeFormat,
    setTimeCodeFormat,
    selectionTimeCodeFormat,
    setSelectionTimeCodeFormat,
    durationTimeCodeFormat,
    setDurationTimeCodeFormat,
  };
}
