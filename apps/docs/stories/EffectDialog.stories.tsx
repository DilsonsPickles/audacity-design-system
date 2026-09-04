import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { EffectDialog, AmplifyEffect, ThemeProvider, lightTheme, Button } from '@audacity-ui/components';

const meta = {
  title: 'Audio/EffectDialog',
  component: EffectDialog,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof EffectDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Basic EffectDialog with Amplify effect content
 */
export const Amplify: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    const [params, setParams] = useState({ amplification: 0, allowClipping: false });

    return (
      <ThemeProvider initialTheme={lightTheme}>
        <div>
          <Button onClick={() => setIsOpen(true)}>
            Open Amplify Effect
          </Button>

          <EffectDialog
            effectName="Amplify"
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            onOk={() => {
              console.log('Apply effect with params:', params);
            }}
            onPreview={() => {
              console.log('Preview effect with params:', params);
            }}
          >
            <AmplifyEffect
              initialAmplification={params.amplification}
              initialAllowClipping={params.allowClipping}
              onChange={setParams}
            />
          </EffectDialog>
        </div>
      </ThemeProvider>
    );
  },
};

/**
 * EffectDialog with custom content
 */
export const CustomEffect: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <ThemeProvider initialTheme={lightTheme}>
        <div>
          <Button onClick={() => setIsOpen(true)}>
            Open Custom Effect
          </Button>

          <EffectDialog
            effectName="Custom Effect"
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            onOk={() => {
              console.log('Apply custom effect');
            }}
            width={700}
            height={600}
          >
            <div style={{ padding: '20px' }}>
              <h3>Custom Effect Controls</h3>
              <p>This is where you would add your custom effect UI.</p>
              <p>You can include sliders, knobs, waveform previews, or any other controls needed for the effect.</p>
            </div>
          </EffectDialog>
        </div>
      </ThemeProvider>
    );
  },
};

/**
 * EffectDialog without preview button
 */
export const WithoutPreview: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <ThemeProvider initialTheme={lightTheme}>
        <div>
          <Button onClick={() => setIsOpen(true)}>
            Open Effect (No Preview)
          </Button>

          <EffectDialog
            effectName="Simple Effect"
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            onOk={() => {
              console.log('Apply effect');
            }}
          >
            <AmplifyEffect />
          </EffectDialog>
        </div>
      </ThemeProvider>
    );
  },
};
