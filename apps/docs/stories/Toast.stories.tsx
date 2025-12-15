import type { Meta, StoryObj } from '@storybook/react';
import { Toast, ToastContainer, toast } from '@audacity-ui/components';
import '@audacity-ui/components/style.css';
import { useEffect } from 'react';

const meta = {
  title: 'Components/Toast',
  component: Toast,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['success', 'error', 'warning', 'info'],
      description: 'Toast type/variant',
    },
    title: {
      control: 'text',
      description: 'Toast title',
    },
    description: {
      control: 'text',
      description: 'Toast description/message',
    },
    showCloseButton: {
      control: 'boolean',
      description: 'Show dismiss button',
    },
  },
} satisfies Meta<typeof Toast>;

export default meta;
type Story = StoryObj<typeof meta>;

// Success toast
export const Success: Story = {
  args: {
    id: 'success-1',
    type: 'success',
    title: 'Success!',
    description: 'Operation completed successfully.',
    showCloseButton: true,
  },
};

// Error toast
export const Error: Story = {
  args: {
    id: 'error-1',
    type: 'error',
    title: 'Error!',
    description: 'Something went wrong. Please try again.',
    showCloseButton: true,
  },
};

// Warning toast
export const Warning: Story = {
  args: {
    id: 'warning-1',
    type: 'warning',
    title: 'Warning!',
    description: 'This action may have unintended consequences.',
    showCloseButton: true,
  },
};

// Info toast
export const Info: Story = {
  args: {
    id: 'info-1',
    type: 'info',
    title: 'Info',
    description: 'Here is some helpful information for you.',
    showCloseButton: true,
  },
};

// With actions
export const WithActions: Story = {
  args: {
    id: 'with-actions-1',
    type: 'success',
    title: 'Success!',
    description: 'All saved changes will now update to the cloud. You can manage this file from your uploaded projects page on audio.com',
    actions: [
      {
        label: 'View on audio.com',
        onClick: () => alert('View clicked!'),
      },
    ],
    showCloseButton: true,
  },
};

// Title only (no description)
export const TitleOnly: Story = {
  args: {
    id: 'title-only-1',
    type: 'info',
    title: 'Quick notification',
    showCloseButton: true,
  },
};

// Interactive demo with ToastContainer
export const InteractiveDemo: Story = {
  render: () => (
    <div style={{ padding: '40px' }}>
      <div style={{ marginBottom: '24px', textAlign: 'center' }}>
        <h3 style={{ marginBottom: '8px', fontFamily: 'Inter, sans-serif', fontSize: '14px' }}>
          Toast Notification Demo
        </h3>
        <p style={{ fontSize: '12px', color: '#666', fontFamily: 'Inter, sans-serif' }}>
          Click buttons to show toasts in the bottom-right corner
        </p>
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={() => toast.success('Success!', 'Operation completed successfully.')}
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            fontFamily: 'Inter, sans-serif',
            cursor: 'pointer',
            backgroundColor: '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          Show Success
        </button>

        <button
          onClick={() => toast.error('Error!', 'Something went wrong. Please try again.')}
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            fontFamily: 'Inter, sans-serif',
            cursor: 'pointer',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          Show Error
        </button>

        <button
          onClick={() => toast.warning('Warning!', 'This action may have consequences.')}
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            fontFamily: 'Inter, sans-serif',
            cursor: 'pointer',
            backgroundColor: '#ff9800',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          Show Warning
        </button>

        <button
          onClick={() => toast.info('Info', 'Here is some helpful information.')}
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            fontFamily: 'Inter, sans-serif',
            cursor: 'pointer',
            backgroundColor: '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          Show Info
        </button>

        <button
          onClick={() =>
            toast.success(
              'Success!',
              'All saved changes will now update to the cloud.',
              [{ label: 'View details', onClick: () => alert('Details clicked!') }]
            )
          }
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            fontFamily: 'Inter, sans-serif',
            cursor: 'pointer',
            backgroundColor: '#9c27b0',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          Toast with Actions
        </button>

        <button
          onClick={() => {
            for (let i = 0; i < 3; i++) {
              setTimeout(() => {
                toast.info(`Toast ${i + 1}`, `This is toast number ${i + 1}`);
              }, i * 500);
            }
          }}
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            fontFamily: 'Inter, sans-serif',
            cursor: 'pointer',
            backgroundColor: '#607d8b',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          Show Multiple (Stacking)
        </button>
      </div>

      <ToastContainer maxToasts={5} />
    </div>
  ),
};

// All types comparison
export const AllTypes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
      <div>
        <div style={{ marginBottom: '8px', fontSize: '12px', color: '#666', fontFamily: 'Inter, sans-serif' }}>
          Success
        </div>
        <Toast
          id="success-demo"
          type="success"
          title="Success!"
          description="Operation completed successfully."
          showCloseButton
        />
      </div>

      <div>
        <div style={{ marginBottom: '8px', fontSize: '12px', color: '#666', fontFamily: 'Inter, sans-serif' }}>
          Error
        </div>
        <Toast
          id="error-demo"
          type="error"
          title="Error!"
          description="Something went wrong. Please try again."
          showCloseButton
        />
      </div>

      <div>
        <div style={{ marginBottom: '8px', fontSize: '12px', color: '#666', fontFamily: 'Inter, sans-serif' }}>
          Warning
        </div>
        <Toast
          id="warning-demo"
          type="warning"
          title="Warning!"
          description="This action may have unintended consequences."
          showCloseButton
        />
      </div>

      <div>
        <div style={{ marginBottom: '8px', fontSize: '12px', color: '#666', fontFamily: 'Inter, sans-serif' }}>
          Info
        </div>
        <Toast
          id="info-demo"
          type="info"
          title="Info"
          description="Here is some helpful information for you."
          showCloseButton
        />
      </div>
    </div>
  ),
};
