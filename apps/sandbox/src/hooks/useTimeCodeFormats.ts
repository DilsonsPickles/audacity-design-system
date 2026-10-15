import { useState } from 'react';
import type { TimeCodeFormat } from '@audacity-ui/components';

export interface UseTimeCodeFormatsReturn {
  timeCodeFormat: TimeCodeFormat;
  setTimeCodeFormat: React.Dispatch<React.SetStateAction<TimeCodeFormat>>;
  selectionTimeCodeFormat: TimeCodeFormat;
  setSelectionTimeCodeFormat: React.Dispatch<React.SetStateAction<TimeCodeFormat>>;
  durationTimeCodeFormat: TimeCodeFormat;
  setDurationTimeCodeFormat: React.Dispatch<React.SetStateAction<TimeCodeFormat>>;
}

/** The transport, selection and duration timecodes open in hh:mm:ss+milliseconds
 *  (2026-10-15, "a sensible default value in the timeline ruler, something like
 *  00m00.000s"): whole seconds hid every sub-second edit — a fade of 0.3 s read
 *  as nothing on the bar. */
export function useTimeCodeFormats(): UseTimeCodeFormatsReturn {
  const [timeCodeFormat, setTimeCodeFormat] = useState<TimeCodeFormat>('hh:mm:ss+milliseconds');
  const [selectionTimeCodeFormat, setSelectionTimeCodeFormat] = useState<TimeCodeFormat>('hh:mm:ss+milliseconds');
  const [durationTimeCodeFormat, setDurationTimeCodeFormat] = useState<TimeCodeFormat>('hh:mm:ss+milliseconds');

  return {
    timeCodeFormat,
    setTimeCodeFormat,
    selectionTimeCodeFormat,
    setSelectionTimeCodeFormat,
    durationTimeCodeFormat,
    setDurationTimeCodeFormat,
  };
}
