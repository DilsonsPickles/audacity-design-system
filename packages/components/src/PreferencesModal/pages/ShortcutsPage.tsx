import { useState } from 'react';
import { Button } from '../../Button';
import { LabeledRadio } from '../../LabeledRadio';
import { SearchField } from '../../SearchField';
import { ShortcutTableHeader } from '../../ShortcutTableHeader';
import { ShortcutTableRow } from '../../ShortcutTableRow';
import { SHORTCUT_ROWS } from './shortcutsData';

// Shortcuts Page Content
export function ShortcutsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchBy, setSearchBy] = useState<'name' | 'shortcut'>('name');
  const [selectedShortcut, setSelectedShortcut] = useState<string | null>(null);

  const shortcuts = SHORTCUT_ROWS;

  return (
    <div className="preferences-page preferences-page--shortcuts">
      <div className="preferences-page__section" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="preferences-page__field--medium">
            <SearchField
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search"
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '12px',
              fontWeight: 400,
              color: '#14151a'
            }}>
              Search by:
            </span>
            <LabeledRadio
              label="Name"
              checked={searchBy === 'name'}
              onChange={() => setSearchBy('name')}
              name="search-by"
              value="name"
            />
            <LabeledRadio
              label="Shortcut"
              checked={searchBy === 'shortcut'}
              onChange={() => setSearchBy('shortcut')}
              name="search-by"
              value="shortcut"
            />
          </div>
        </div>

        <div className="shortcuts-table">
          <ShortcutTableHeader />
          <div className="shortcuts-table__body">
            {shortcuts.map((shortcut) => (
              <ShortcutTableRow
                key={shortcut.id}
                action={shortcut.action}
                shortcut={shortcut.shortcut}
                selected={selectedShortcut === shortcut.id}
                onClick={() => setSelectedShortcut(shortcut.id)}
              />
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary">Import</Button>
            <Button variant="secondary">Export</Button>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary">Clear</Button>
            <Button variant="secondary">Reset to default</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
