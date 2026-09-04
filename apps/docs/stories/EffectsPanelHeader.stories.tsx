import type { Meta, StoryObj } from '@storybook/react';
import { EffectsPanelHeader, ThemeProvider, darkTheme } from '@audacity-ui/components';

const meta = {
  title: 'Components/EffectsPanelHeader',
  component: EffectsPanelHeader,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider theme={darkTheme}>
        <div style={{ width: '240px' }}>
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
} satisfies Meta<typeof EffectsPanelHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default effects panel header with title and close button
 */
export const Default: Story = {
  args: {
    title: 'Effects',
    onClose: () => console.log('Close clicked'),
  },
};

/**
 * Custom title
 */
export const CustomTitle: Story = {
  args: {
    title: 'Audio Effects',
    onClose: () => console.log('Close clicked'),
  },
};

/**
 * Without close handler (button still visible)
 */
export const NoCloseHandler: Story = {
  args: {
    title: 'Effects',
  },
};

/**
 * Long title with overflow
 */
export const LongTitle: Story = {
  args: {
    title: 'Very Long Effects Panel Title That Should Truncate',
    onClose: () => console.log('Close clicked'),
  },
};
