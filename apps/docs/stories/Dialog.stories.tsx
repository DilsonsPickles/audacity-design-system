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
 * Complete Flow - Share Audio with Layered Sign-In
 * Demonstrates the full dialog sequence when saving a project.
 *
 * Flow:
 * 1. Enter project name and click "Done"
 * 2. Create Account dialog appears ON TOP (Share Audio stays open behind)
 * 3. Sign in with credentials (username: admin, password: password) or social buttons
 * 4. After successful sign-in, return to Share Audio dialog in signed-in state
 * 5. Click "Done" again to save the project
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
          <p style={{ marginTop: '16px', fontSize: '12px', color: '#666', maxWidth: '500px', margin: '16px auto 0' }}>
            <strong>Complete Flow:</strong><br />
            1. Enter project name and click "Done"<br />
            2. Sign-in dialog appears on top (Share Audio stays behind)<br />
            3. Sign in (username: <code>admin</code>, password: <code>password</code>) or use social buttons<br />
            4. After sign-in, return to Share Audio in signed-in state<br />
            5. Click "Done" to save project
          </p>
        </div>

        {/* Share Audio Dialog - Stays open when Create Account appears */}
        <Dialog
          isOpen={isShareOpen}
          title="Save to audio.com"
          onClose={() => {
            setIsShareOpen(false);
            setProjectName('');
          }}
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
                if (isSignedIn) {
                  // User is signed in, save the project
                  toast('Project saved successfully!', 'success');
                  setIsShareOpen(false);
                  setProjectName('');
                } else if (projectName.trim()) {
                  // User needs to sign in, open Create Account dialog on top
                  setIsCreateAccountOpen(true);
                } else {
                  toast('Please enter a project name', 'error');
                }
              }}
              onSecondaryClick={() => {
                setIsShareOpen(false);
                setProjectName('');
              }}
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

        {/* Create Account Dialog - Appears on top of Share Audio */}
        <Dialog
          isOpen={isCreateAccountOpen}
          title="Save to audio.com"
          onClose={() => {
            setIsCreateAccountOpen(false);
            setEmail('');
            setPassword('');
          }}
          width={420}
          footer={
            <DialogFooter
              primaryText="Continue"
              secondaryText="Cancel"
              onPrimaryClick={() => {
                // Validate credentials
                if (email === 'admin' && password === 'password') {
                  toast('Sign in successful!', 'success');
                  setIsCreateAccountOpen(false);
                  setIsSignedIn(true);
                  setEmail('');
                  setPassword('');
                } else if (email.trim() && password.trim()) {
                  toast('Invalid email or password', 'error');
                } else {
                  toast('Please fill in all fields', 'error');
                }
              }}
              onSecondaryClick={() => {
                setIsCreateAccountOpen(false);
                setEmail('');
                setPassword('');
              }}
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
                  toast('Signed in with Google!', 'success');
                  setIsCreateAccountOpen(false);
                  setIsSignedIn(true);
                  setEmail('');
                  setPassword('');
                }}
              />
              <SocialSignInButton
                provider="facebook"
                onClick={() => {
                  toast('Signed in with Facebook!', 'success');
                  setIsCreateAccountOpen(false);
                  setIsSignedIn(true);
                  setEmail('');
                  setPassword('');
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
