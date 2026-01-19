import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { TableRow, TableCell, Checkbox, Dropdown, SearchField } from '@audacity-ui/components';

const meta = {
  title: 'Components/Table/TableCell',
  component: TableCell,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    width: {
      control: 'number',
      description: 'Fixed width in pixels',
    },
    flexGrow: {
      control: 'boolean',
      description: 'Whether the cell should grow to fill available space',
    },
    align: {
      control: 'radio',
      options: ['left', 'center'],
      description: 'Text alignment',
    },
  },
} satisfies Meta<typeof TableCell>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Basic cell with plain text content
 */
export const Text: Story = {
  render: () => (
    <TableRow>
      <TableCell>Simple text content</TableCell>
    </TableRow>
  ),
};

/**
 * Cell with a checkbox control
 */
export const WithCheckbox: Story = {
  render: () => {
    const [checked, setChecked] = React.useState(true);
    return (
      <TableRow>
        <TableCell align="center">
          <Checkbox checked={checked} onChange={setChecked} />
        </TableCell>
      </TableRow>
    );
  },
};

/**
 * Cell with a dropdown control
 */
export const WithDropdown: Story = {
  render: () => {
    const [value, setValue] = React.useState('option1');
    return (
      <TableRow>
        <TableCell width={200}>
          <Dropdown
            value={value}
            onChange={setValue}
            options={[
              { value: 'option1', label: 'Option 1' },
              { value: 'option2', label: 'Option 2' },
              { value: 'option3', label: 'Option 3' },
            ]}
          />
        </TableCell>
      </TableRow>
    );
  },
};

/**
 * Cell with a search field
 */
export const WithSearchField: Story = {
  render: () => {
    const [value, setValue] = React.useState('');
    return (
      <TableRow>
        <TableCell width={240}>
          <SearchField
            value={value}
            onChange={setValue}
            placeholder="Search..."
          />
        </TableCell>
      </TableRow>
    );
  },
};

/**
 * Cell with custom styled content (status indicator)
 */
export const CustomContent: Story = {
  render: () => (
    <TableRow>
      <TableCell>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#4ade80'
          }} />
          <span>Active Plugin</span>
        </div>
      </TableCell>
    </TableRow>
  ),
};

/**
 * Centered alignment
 */
export const Centered: Story = {
  render: () => (
    <TableRow>
      <TableCell align="center">
        Centered text
      </TableCell>
    </TableRow>
  ),
};

/**
 * Cell with long text that gets truncated with ellipsis
 */
export const TextTruncation: Story = {
  render: () => (
    <div style={{ width: '300px' }}>
      <TableRow>
        <TableCell width={300}>
          This is a very long text that will be truncated with ellipsis because it exceeds the cell width
        </TableCell>
      </TableRow>
      <div style={{ marginTop: '16px', fontSize: '12px', color: '#666', fontFamily: 'Inter, sans-serif' }}>
        Long content is truncated with ellipsis when it exceeds the cell width
      </div>
    </div>
  ),
};
