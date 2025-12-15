import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import {
  Dialog,
  DialogFooter,
  SignInActionBar,
  LabeledInput,
  SocialSignInButton,
  LabeledFormDivider,
  TextLink,
  Button,
  toast,
  ToastContainer
} from '@audacity-ui/components';
import '@audacity-ui/components/style.css';

const meta = {
  title: 'Components/Dialog',
  component: Dialog,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Basic dialog with title and content
 */
export const Basic: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <>
        <Button variant="primary" onClick={() => setIsOpen(true)}>
          Open Dialog
        </Button>
        <Dialog
          isOpen={isOpen}
          title="Basic Dialog"
          onClose={() => setIsOpen(false)}
          width={400}
        >
          <p>This is a basic dialog with some content.</p>
        </Dialog>
      </>
    );
  },
};

/**
 * Dialog with footer buttons
 */
export const WithFooter: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <>
        <Button variant="primary" onClick={() => setIsOpen(true)}>
          Open Dialog with Footer
        </Button>
        <Dialog
          isOpen={isOpen}
          title="Confirm Action"
          onClose={() => setIsOpen(false)}
          width={400}
          footer={
            <DialogFooter
              primaryText="Confirm"
              secondaryText="Cancel"
              onPrimaryClick={() => {
                alert('Confirmed!');
                setIsOpen(false);
              }}
              onSecondaryClick={() => setIsOpen(false)}
            />
          }
        >
          <p>Are you sure you want to perform this action?</p>
        </Dialog>
      </>
    );
  },
};

/**
 * Share Audio Dialog - First step in the save flow
 * Shows signed-in state with user action bar and project name input
 */
export const ShareAudioDialog: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isSignedIn, setIsSignedIn] = useState(true);
    const [projectName, setProjectName] = useState('');

    return (
      <>
        <ToastContainer />
        <Button variant="primary" onClick={() => setIsOpen(true)}>
          Open Share Audio Dialog
        </Button>
        <Dialog
          isOpen={isOpen}
          title="Save to audio.com"
          onClose={() => setIsOpen(false)}
          width={400}
          headerContent={
            <SignInActionBar
              signedIn={isSignedIn}
              userName="Alex Dawson"
              onSignOut={() => setIsSignedIn(false)}
            />
          }
          footer={
            <DialogFooter
              primaryText="Done"
              secondaryText="Cancel"
              onPrimaryClick={() => {
                if (projectName.trim()) {
                  toast('Project saved successfully!', 'success');
                  setIsOpen(false);
                } else {
                  toast('Please enter a project name', 'error');
                }
              }}
              onSecondaryClick={() => setIsOpen(false)}
              primaryDisabled={!projectName.trim()}
            />
          }
        >
          <LabeledInput
            label="Project name"
            value={projectName}
            onChange={setProjectName}
            placeholder="Enter project name"
            width="100%"
          />
        </Dialog>
      </>
    );
  },
};

/**
 * Create Account Dialog - Sign-up flow with social auth and email/password
 * Appears after user completes project name in Share Audio dialog
 */
export const CreateAccountDialog: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    return (
      <>
        <ToastContainer />
        <Button variant="primary" onClick={() => setIsOpen(true)}>
          Open Create Account Dialog
        </Button>
        <Dialog
          isOpen={isOpen}
          title="Save to audio.com"
          onClose={() => setIsOpen(false)}
          width={420}
          footer={
            <DialogFooter
              primaryText="Continue"
              secondaryText="Cancel"
              onPrimaryClick={() => {
                if (email.trim() && password.trim()) {
                  toast('Account created successfully!', 'success');
                  setIsOpen(false);
                } else {
                  toast('Please fill in all fields', 'error');
                }
              }}
              onSecondaryClick={() => setIsOpen(false)}
            />
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '12px', lineHeight: '16px', margin: 0 }}>
              Create a free cloud storage account to access your projects and audio from any device
            </p>

            <div style={{ display: 'flex', gap: '8px' }}>
              <SocialSignInButton
                provider="google"
                onClick={() => toast('Google sign-in clicked', 'info')}
              />
              <SocialSignInButton
                provider="facebook"
                onClick={() => toast('Facebook sign-in clicked', 'info')}
              />
            </div>

            <LabeledFormDivider label="Or use email and password" />

            <LabeledInput
              label="Email"
              value={email}
              onChange={setEmail}
              placeholder="Enter email"
              width="100%"
              type="email"
            />

            <LabeledInput
              label="Password"
              value={password}
              onChange={setPassword}
              placeholder="Enter password"
              width="100%"
              type="password"
            />

            <div style={{ display: 'flex', gap: '4px', fontSize: '12px', lineHeight: 'normal' }}>
              <span>Already have an account?</span>
              <TextLink onClick={() => toast('Sign in clicked', 'info')}>
                Sign in here
              </TextLink>
            </div>
          </div>
        </Dialog>
      </>
    );
  },
};

/**
 * Complete Flow - Share Audio → Create Account
 * Demonstrates the full dialog sequence when saving a project
 */
export const CompleteFlow: Story = {
  render: () => {
    const [isShareOpen, setIsShareOpen] = useState(false);
    const [isCreateAccountOpen, setIsCreateAccountOpen] = useState(false);
    const [isSignedIn, setIsSignedIn] = useState(false);
    const [projectName, setProjectName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    return (
      <>
        <ToastContainer />
        <div style={{ textAlign: 'center' }}>
          <Button variant="primary" onClick={() => setIsShareOpen(true)}>
            Start: Save to audio.com
          </Button>
          <p style={{ marginTop: '16px', fontSize: '12px', color: '#666' }}>
            This demonstrates the complete flow:<br />
            1. Enter project name<br />
            2. Click "Done" to proceed to account creation
          </p>
        </div>

        {/* Share Audio Dialog */}
        <Dialog
          isOpen={isShareOpen}
          title="Save to audio.com"
          onClose={() => setIsShareOpen(false)}
          width={400}
          headerContent={
            <SignInActionBar
              signedIn={isSignedIn}
              userName="Alex Dawson"
              onSignOut={() => setIsSignedIn(false)}
            />
          }
          footer={
            <DialogFooter
              primaryText="Done"
              secondaryText="Cancel"
              onPrimaryClick={() => {
                if (projectName.trim()) {
                  setIsShareOpen(false);
                  setIsCreateAccountOpen(true);
                } else {
                  toast('Please enter a project name', 'error');
                }
              }}
              onSecondaryClick={() => setIsShareOpen(false)}
              primaryDisabled={!projectName.trim()}
            />
          }
        >
          <LabeledInput
            label="Project name"
            value={projectName}
            onChange={setProjectName}
            placeholder="Enter project name"
            width="100%"
          />
        </Dialog>

        {/* Create Account Dialog */}
        <Dialog
          isOpen={isCreateAccountOpen}
          title="Save to audio.com"
          onClose={() => setIsCreateAccountOpen(false)}
          width={420}
          footer={
            <DialogFooter
              primaryText="Continue"
              secondaryText="Cancel"
              onPrimaryClick={() => {
                if (email.trim() && password.trim()) {
                  toast('Account created successfully!', 'success');
                  setIsCreateAccountOpen(false);
                  setIsSignedIn(true);
                } else {
                  toast('Please fill in all fields', 'error');
                }
              }}
              onSecondaryClick={() => setIsCreateAccountOpen(false)}
            />
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '12px', lineHeight: '16px', margin: 0 }}>
              Create a free cloud storage account to access your projects and audio from any device
            </p>

            <div style={{ display: 'flex', gap: '8px' }}>
              <SocialSignInButton
                provider="google"
                onClick={() => {
                  toast('Account created with Google!', 'success');
                  setIsCreateAccountOpen(false);
                  setIsSignedIn(true);
                }}
              />
              <SocialSignInButton
                provider="facebook"
                onClick={() => {
                  toast('Account created with Facebook!', 'success');
                  setIsCreateAccountOpen(false);
                  setIsSignedIn(true);
                }}
              />
            </div>

            <LabeledFormDivider label="Or use email and password" />

            <LabeledInput
              label="Email"
              value={email}
              onChange={setEmail}
              placeholder="Enter email"
              width="100%"
              type="email"
            />

            <LabeledInput
              label="Password"
              value={password}
              onChange={setPassword}
              placeholder="Enter password"
              width="100%"
              type="password"
            />

            <div style={{ display: 'flex', gap: '4px', fontSize: '12px', lineHeight: 'normal' }}>
              <span>Already have an account?</span>
              <TextLink onClick={() => {
                setIsCreateAccountOpen(false);
                toast('Would show sign-in dialog', 'info');
              }}>
                Sign in here
              </TextLink>
            </div>
          </div>
        </Dialog>
      </>
    );
  },
};

/**
 * Wide Dialog - Example of custom width
 */
export const WideDialog: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <>
        <Button variant="primary" onClick={() => setIsOpen(true)}>
          Open Wide Dialog
        </Button>
        <Dialog
          isOpen={isOpen}
          title="Wide Dialog"
          onClose={() => setIsOpen(false)}
          width={600}
          footer={
            <DialogFooter
              primaryText="OK"
              secondaryText="Cancel"
              onPrimaryClick={() => setIsOpen(false)}
              onSecondaryClick={() => setIsOpen(false)}
            />
          }
        >
          <p>This is a wider dialog with 600px width.</p>
        </Dialog>
      </>
    );
  },
};
