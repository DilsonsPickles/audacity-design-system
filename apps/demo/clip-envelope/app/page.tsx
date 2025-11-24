import ClipEnvelopeEditor from './components/ClipEnvelopeEditor';
import Script from 'next/script';

export default function Home() {
  return (
    <>
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/js/all.min.js" />
      <ClipEnvelopeEditor />
    </>
  );
}
