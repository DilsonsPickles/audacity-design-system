import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Table, TableBody, TableRow, TableCell } from '@audacity-ui/components';

const meta = {
  title: 'Components/Table/TableRow',
  component: TableRow,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof TableRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div style={{ width: '600px' }}>
      <Table>
        <TableBody>
          <TableRow>
            <TableCell width={200}>Cell 1</TableCell>
            <TableCell width={200}>Cell 2</TableCell>
            <TableCell width={200}>Cell 3</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  ),
};

export const MultipleRows: Story = {
  render: () => (
    <div style={{ width: '600px' }}>
      <Table>
        <TableBody>
          <TableRow>
            <TableCell width={200}>Row 1, Cell 1</TableCell>
            <TableCell width={200}>Row 1, Cell 2</TableCell>
            <TableCell width={200}>Row 1, Cell 3</TableCell>
          </TableRow>
          <TableRow>
            <TableCell width={200}>Row 2, Cell 1</TableCell>
            <TableCell width={200}>Row 2, Cell 2</TableCell>
            <TableCell width={200}>Row 2, Cell 3</TableCell>
          </TableRow>
          <TableRow>
            <TableCell width={200}>Row 3, Cell 1</TableCell>
            <TableCell width={200}>Row 3, Cell 2</TableCell>
            <TableCell width={200}>Row 3, Cell 3</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  ),
};

export const WithHoverState: Story = {
  render: () => (
    <div style={{ width: '600px' }}>
      <Table>
        <TableBody>
          <TableRow>
            <TableCell width={200}>Hover over this row</TableCell>
            <TableCell width={200}>To see the hover effect</TableCell>
            <TableCell width={200}>Applied to the row</TableCell>
          </TableRow>
          <TableRow>
            <TableCell width={200}>Second row</TableCell>
            <TableCell width={200}>Also has hover</TableCell>
            <TableCell width={200}>State</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  ),
};

export const FixedHeight: Story = {
  render: () => (
    <div style={{ width: '600px' }}>
      <Table>
        <TableBody>
          <TableRow>
            <TableCell width={200}>All rows are 40px tall</TableCell>
            <TableCell width={200}>Consistent height</TableCell>
            <TableCell width={200}>Across all rows</TableCell>
          </TableRow>
          <TableRow>
            <TableCell width={200}>Even with</TableCell>
            <TableCell width={200}>Different content</TableCell>
            <TableCell width={200}>Lengths</TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <div style={{ marginTop: '16px', fontSize: '12px', color: '#666', fontFamily: 'Inter, sans-serif' }}>
        Each row is exactly 40px in height
      </div>
    </div>
  ),
};
