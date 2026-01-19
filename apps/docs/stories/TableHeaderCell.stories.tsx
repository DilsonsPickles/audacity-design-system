import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Table, TableHeader, TableHeaderCell } from '@audacity-ui/components';

const meta = {
  title: 'Components/Table/TableHeaderCell',
  component: TableHeaderCell,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof TableHeaderCell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div style={{ width: '600px' }}>
      <Table>
        <TableHeader>
          <TableHeaderCell width={200}>Column 1</TableHeaderCell>
          <TableHeaderCell width={200}>Column 2</TableHeaderCell>
          <TableHeaderCell width={200}>Column 3</TableHeaderCell>
        </TableHeader>
      </Table>
    </div>
  ),
};

export const Sortable: Story = {
  render: () => {
    const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc' | null>(null);

    return (
      <div style={{ width: '600px' }}>
        <Table>
          <TableHeader>
            <TableHeaderCell width={200}>Not Sortable</TableHeaderCell>
            <TableHeaderCell
              width={200}
              sortable
              sortDirection={sortDirection}
              onSort={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
            >
              Sortable Column
            </TableHeaderCell>
            <TableHeaderCell width={200}>Not Sortable</TableHeaderCell>
          </TableHeader>
        </Table>
        <div style={{ marginTop: '16px', fontSize: '12px', color: '#666', fontFamily: 'Inter, sans-serif' }}>
          Click the middle column to toggle sort direction
        </div>
      </div>
    );
  },
};

export const SortStates: Story = {
  render: () => (
    <div style={{ width: '800px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <div style={{ fontSize: '12px', marginBottom: '8px', fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>
          No sort (default)
        </div>
        <Table>
          <TableHeader>
            <TableHeaderCell width={200} sortable>
              Column Name
            </TableHeaderCell>
          </TableHeader>
        </Table>
      </div>
      <div>
        <div style={{ fontSize: '12px', marginBottom: '8px', fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>
          Ascending
        </div>
        <Table>
          <TableHeader>
            <TableHeaderCell width={200} sortable sortDirection="asc">
              Column Name
            </TableHeaderCell>
          </TableHeader>
        </Table>
      </div>
      <div>
        <div style={{ fontSize: '12px', marginBottom: '8px', fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>
          Descending
        </div>
        <Table>
          <TableHeader>
            <TableHeaderCell width={200} sortable sortDirection="desc">
              Column Name
            </TableHeaderCell>
          </TableHeader>
        </Table>
      </div>
    </div>
  ),
};

export const CenterAligned: Story = {
  render: () => (
    <div style={{ width: '600px' }}>
      <Table>
        <TableHeader>
          <TableHeaderCell width={200}>Left (default)</TableHeaderCell>
          <TableHeaderCell width={200} align="center">
            Center
          </TableHeaderCell>
          <TableHeaderCell width={200}>Left (default)</TableHeaderCell>
        </TableHeader>
      </Table>
    </div>
  ),
};

export const MixedWidths: Story = {
  render: () => (
    <div style={{ width: '800px' }}>
      <Table>
        <TableHeader>
          <TableHeaderCell width={80} align="center">
            Enabled
          </TableHeaderCell>
          <TableHeaderCell width={250} sortable>
            Name
          </TableHeaderCell>
          <TableHeaderCell flexGrow>
            Path
          </TableHeaderCell>
          <TableHeaderCell width={120} sortable>
            Type
          </TableHeaderCell>
        </TableHeader>
      </Table>
      <div style={{ marginTop: '16px', fontSize: '12px', color: '#666', fontFamily: 'Inter, sans-serif' }}>
        Typical plugin manager table header layout
      </div>
    </div>
  ),
};

export const FlexGrow: Story = {
  render: () => (
    <div style={{ width: '800px' }}>
      <Table>
        <TableHeader>
          <TableHeaderCell width={100}>Fixed 100px</TableHeaderCell>
          <TableHeaderCell flexGrow>This column grows to fill remaining space</TableHeaderCell>
          <TableHeaderCell width={100}>Fixed 100px</TableHeaderCell>
        </TableHeader>
      </Table>
    </div>
  ),
};

export const AllFeatures: Story = {
  render: () => {
    const [sort1, setSort1] = React.useState<'asc' | 'desc' | null>(null);
    const [sort2, setSort2] = React.useState<'asc' | 'desc' | null>(null);

    return (
      <div style={{ width: '800px' }}>
        <Table>
          <TableHeader>
            <TableHeaderCell width={80} align="center">
              Checkbox
            </TableHeaderCell>
            <TableHeaderCell
              width={250}
              sortable
              sortDirection={sort1}
              onSort={() => setSort1(sort1 === 'asc' ? 'desc' : 'asc')}
            >
              Name (Sortable)
            </TableHeaderCell>
            <TableHeaderCell flexGrow>
              Path (Flex Grow)
            </TableHeaderCell>
            <TableHeaderCell
              width={120}
              sortable
              sortDirection={sort2}
              onSort={() => setSort2(sort2 === 'asc' ? 'desc' : 'asc')}
            >
              Type (Sortable)
            </TableHeaderCell>
          </TableHeader>
        </Table>
      </div>
    );
  },
};
