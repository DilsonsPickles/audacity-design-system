import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { ProjectThumbnail } from '@audacity-ui/components';

const meta: Meta<typeof ProjectThumbnail> = {
  title: 'Components/ProjectThumbnail',
  component: ProjectThumbnail,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
      description: 'Project title',
    },
    dateText: {
      control: 'text',
      description: 'Date/timestamp text (e.g., "TODAY", "YESTERDAY")',
    },
    thumbnailUrl: {
      control: 'text',
      description: 'Project thumbnail image URL',
    },
    isNewProject: {
      control: 'boolean',
      description: 'Whether this is the "New project" card',
    },
    isCloudProject: {
      control: 'boolean',
      description: 'Whether this is a cloud project (shows cloud icon badge)',
    },
  },
};

export default meta;
type Story = StoryObj<typeof ProjectThumbnail>;

export const Default: Story = {
  args: {
    title: 'Audio file 2025-10-21 10-57-03-23 03',
    dateText: 'TODAY',
  },
};

export const WithCloudBadge: Story = {
  args: {
    title: 'My Cloud Project',
    dateText: 'TODAY',
    isCloudProject: true,
  },
};

export const WithThumbnail: Story = {
  args: {
    title: 'My Podcast Episode',
    dateText: 'YESTERDAY',
    thumbnailUrl: 'https://picsum.photos/234/142',
  },
};

export const WithThumbnailAndCloud: Story = {
  args: {
    title: 'Synced Recording',
    dateText: '2 DAYS AGO',
    thumbnailUrl: 'https://picsum.photos/seed/audio/234/142',
    isCloudProject: true,
  },
};

export const NewProject: Story = {
  args: {
    title: 'New Project',
    isNewProject: true,
  },
};

export const Grid: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 234px)', gap: '24px' }}>
      <ProjectThumbnail
        title="New Project"
        isNewProject={true}
      />
      <ProjectThumbnail
        title="Audio file 2025-10-21 10-57-03-23 03"
        dateText="TODAY"
      />
      <ProjectThumbnail
        title="My Cloud Project"
        dateText="TODAY"
        isCloudProject={true}
      />
      <ProjectThumbnail
        title="Recording Session"
        dateText="YESTERDAY"
        thumbnailUrl="https://picsum.photos/seed/audio1/234/142"
      />
      <ProjectThumbnail
        title="Podcast Episode 1"
        dateText="2 DAYS AGO"
        thumbnailUrl="https://picsum.photos/seed/audio2/234/142"
        isCloudProject={true}
      />
      <ProjectThumbnail
        title="Music Mix"
        dateText="1 WEEK AGO"
        thumbnailUrl="https://picsum.photos/seed/audio3/234/142"
      />
    </div>
  ),
};
