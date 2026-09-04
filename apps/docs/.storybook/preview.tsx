import React from 'react';
import type { Preview } from '@storybook/react';
import { PreferencesProvider, ThemeProvider } from '@audacity-ui/components';
import '@audacity-ui/components/style.css';

// Import Inter font from Google Fonts
const link = document.createElement('link');
link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
link.rel = 'stylesheet';
document.head.appendChild(link);

// Add CSS variables for font sizes
const style = document.createElement('style');
style.textContent = `
  :root {
    --font-size-body: 12px;
    --font-size-body-bold: 12px;
  }
`;
document.head.appendChild(style);

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [
    (Story) => (
      <ThemeProvider>
        <PreferencesProvider>
          <Story />
        </PreferencesProvider>
      </ThemeProvider>
    ),
  ],
};

export default preview;
