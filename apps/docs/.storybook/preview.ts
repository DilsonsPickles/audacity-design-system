import type { Preview } from '@storybook/react';
import { withSpacing } from './decorators/SpacingDecorator';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [withSpacing],
  globalTypes: {
    showPadding: {
      description: 'Show padding overlay',
      defaultValue: false,
      toolbar: {
        title: 'Padding',
        icon: 'box',
        items: [
          { value: false, title: 'Hide Padding', icon: 'eye' },
          { value: true, title: 'Show Padding', icon: 'eyeclose' },
        ],
        dynamicTitle: true,
      },
    },
    showMargins: {
      description: 'Show margin overlay',
      defaultValue: false,
      toolbar: {
        title: 'Margins',
        icon: 'outline',
        items: [
          { value: false, title: 'Hide Margins', icon: 'eye' },
          { value: true, title: 'Show Margins', icon: 'eyeclose' },
        ],
        dynamicTitle: true,
      },
    },
    showMeasurements: {
      description: 'Show spacing measurements',
      defaultValue: false,
      toolbar: {
        title: 'Measurements',
        icon: 'ruler',
        items: [
          { value: false, title: 'Hide Measurements', icon: 'eye' },
          { value: true, title: 'Show Measurements', icon: 'eyeclose' },
        ],
        dynamicTitle: true,
      },
    },
  },
};

export default preview;
