import React from 'react';
import ReactDOM from 'react-dom/client';
// import App from './App'; // Original clip demo
import CanvasDemo from './demos/CanvasDemo'; // New Canvas demo with Context
import '@audacity-ui/components/dist/index.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CanvasDemo />
  </React.StrictMode>
);
