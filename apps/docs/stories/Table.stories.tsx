import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Table, TableHeader, TableHeaderCell, TableBody, TableRow, TableCell, Checkbox } from '@audacity-ui/components';

const meta = {
  title: 'Components/Table',
  component: Table,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

// Sample data
const sampleData = [
  { id: '1', name: 'Reverb', type: 'Nyquist', path: '/Library/Audio/Plug-Ins/Nyquist/reverb.ny', enabled: true },
  { id: '2', name: 'Delay', type: 'Nyquist', path: '/Library/Audio/Plug-Ins/Nyquist/delay.ny', enabled: true },
  { id: '3', name: 'Compressor', type: 'Internal effect', path: '/Applications/Audacity.app/Contents/PlugIns/compressor', enabled: true },
  { id: '4', name: 'Noise Gate', type: 'Internal effect', path: '/Applications/Audacity.app/Contents/PlugIns/noisegate', enabled: false },
  { id: '5', name: 'AUGraphicEQ', type: 'Audio unit', path: '/System/Library/Components/AUGraphicEQ.component', enabled: true },
  { id: '6', name: 'FabFilter Pro-Q 3', type: 'VST3', path: '/Library/Audio/Plug-Ins/VST3/FabFilter Pro-Q 3.vst3', enabled: true },
  { id: '7', name: 'Valhalla VintageVerb', type: 'VST', path: '/Library/Audio/Plug-Ins/VST/ValhallaVintageVerb.vst', enabled: true },
  { id: '8', name: 'TAP Equalizer', type: 'LADSPA', path: '/usr/lib/ladspa/tap_eq.so', enabled: true },
];

export const Basic: Story = {
  render: () => (
    <div style={{ width: '800px' }}>
      <Table>
        <TableHeader>
          <TableHeaderCell width={80} align="center">
            Enabled
          </TableHeaderCell>
          <TableHeaderCell width={250}>
            Name
          </TableHeaderCell>
          <TableHeaderCell flexGrow>
            Path
          </TableHeaderCell>
          <TableHeaderCell width={120}>
            Type
          </TableHeaderCell>
        </TableHeader>
        <TableBody>
          {sampleData.map((item) => (
            <TableRow key={item.id}>
              <TableCell width={80} align="center">
                <Checkbox checked={item.enabled} />
              </TableCell>
              <TableCell width={250}>{item.name}</TableCell>
              <TableCell flexGrow>{item.path}</TableCell>
              <TableCell width={120}>{item.type}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  ),
};

export const WithSorting: Story = {
  render: () => {
    const [sortColumn, setSortColumn] = React.useState<'name' | 'type' | null>(null);
    const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc');

    const handleSort = (column: 'name' | 'type') => {
      if (sortColumn === column) {
        setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        setSortColumn(column);
        setSortDirection('asc');
      }
    };

    const sortedData = [...sampleData].sort((a, b) => {
      if (!sortColumn) return 0;
      const comparison = a[sortColumn].localeCompare(b[sortColumn]);
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return (
      <div style={{ width: '800px' }}>
        <Table>
          <TableHeader>
            <TableHeaderCell width={80} align="center">
              Enabled
            </TableHeaderCell>
            <TableHeaderCell
              width={250}
              sortable
              sortDirection={sortColumn === 'name' ? sortDirection : null}
              onSort={() => handleSort('name')}
            >
              Name
            </TableHeaderCell>
            <TableHeaderCell flexGrow>
              Path
            </TableHeaderCell>
            <TableHeaderCell
              width={120}
              sortable
              sortDirection={sortColumn === 'type' ? sortDirection : null}
              onSort={() => handleSort('type')}
            >
              Type
            </TableHeaderCell>
          </TableHeader>
          <TableBody>
            {sortedData.map((item) => (
              <TableRow key={item.id}>
                <TableCell width={80} align="center">
                  <Checkbox checked={item.enabled} />
                </TableCell>
                <TableCell width={250}>{item.name}</TableCell>
                <TableCell flexGrow>{item.path}</TableCell>
                <TableCell width={120}>{item.type}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  },
};

export const WithScroll: Story = {
  render: () => (
    <div style={{ width: '800px' }}>
      <Table minBodyHeight={300} maxBodyHeight={300}>
        <TableHeader>
          <TableHeaderCell width={80} align="center">
            Enabled
          </TableHeaderCell>
          <TableHeaderCell width={250}>
            Name
          </TableHeaderCell>
          <TableHeaderCell flexGrow>
            Path
          </TableHeaderCell>
          <TableHeaderCell width={120}>
            Type
          </TableHeaderCell>
        </TableHeader>
        <TableBody>
          {sampleData.map((item) => (
            <TableRow key={item.id}>
              <TableCell width={80} align="center">
                <Checkbox checked={item.enabled} />
              </TableCell>
              <TableCell width={250}>{item.name}</TableCell>
              <TableCell flexGrow>{item.path}</TableCell>
              <TableCell width={120}>{item.type}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  ),
};

export const Interactive: Story = {
  render: () => {
    const [data, setData] = React.useState(sampleData);

    const toggleEnabled = (id: string) => {
      setData(data.map(item =>
        item.id === id ? { ...item, enabled: !item.enabled } : item
      ));
    };

    return (
      <div style={{ width: '800px' }}>
        <Table>
          <TableHeader>
            <TableHeaderCell width={80} align="center">
              Enabled
            </TableHeaderCell>
            <TableHeaderCell width={250}>
              Name
            </TableHeaderCell>
            <TableHeaderCell flexGrow>
              Path
            </TableHeaderCell>
            <TableHeaderCell width={120}>
              Type
            </TableHeaderCell>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.id}>
                <TableCell width={80} align="center">
                  <Checkbox
                    checked={item.enabled}
                    onChange={() => toggleEnabled(item.id)}
                  />
                </TableCell>
                <TableCell width={250}>{item.name}</TableCell>
                <TableCell flexGrow>{item.path}</TableCell>
                <TableCell width={120}>{item.type}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  },
};
