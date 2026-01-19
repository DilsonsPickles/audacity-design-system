import React, { useState, useMemo } from 'react';
import { Dialog } from '../Dialog';
import { Button } from '../Button';
import { FilterChip } from '../FilterChip';
import './PluginBrowserDialog.css';

export type PluginCategory =
  | 'all'
  | 'voice-podcasting'
  | 'mixing-mastering'
  | 'reverb-delay'
  | 'de-esser'
  | 'guitars-amp-simulation'
  | 'sound-design-effects'
  | 'tone-dynamics'
  | 'tape-texture'
  | 'beats-percussion';

export interface BrowserPlugin {
  id: string;
  name: string;
  description: string;
  categories: PluginCategory[];
  imageUrl?: string;
  isFree?: boolean;
  requiresVersion?: string;
}

export interface PluginBrowserDialogProps {
  /**
   * Whether the dialog is open
   */
  isOpen: boolean;
  /**
   * Close handler
   */
  onClose: () => void;
  /**
   * Current category
   */
  currentCategory?: PluginCategory;
  /**
   * Category change handler
   */
  onCategoryChange?: (category: PluginCategory) => void;
  /**
   * Operating system for platform-specific header controls
   * @default 'macos'
   */
  os?: 'macos' | 'windows';
  /**
   * Additional CSS classes
   */
  className?: string;
}

const categories: { id: PluginCategory; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'voice-podcasting', label: 'Voice & Podcasting' },
  { id: 'mixing-mastering', label: 'Mixing & Mastering' },
  { id: 'reverb-delay', label: 'Reverb & Delay' },
  { id: 'de-esser', label: 'De-Esser' },
  { id: 'guitars-amp-simulation', label: 'Guitars & Amp' },
  { id: 'sound-design-effects', label: 'Sound Design' },
  { id: 'tone-dynamics', label: 'Tone & Dynamics' },
  { id: 'tape-texture', label: 'Tape & Texture' },
  { id: 'beats-percussion', label: 'Beats & Percussion' },
];

// Mock plugin data - all plugins with their categories
const allPlugins: BrowserPlugin[] = [
  {
    id: 'openvino',
    name: 'OpenVINO AI Tools',
    description: 'AI-powered audio processing tools',
    categories: ['voice-podcasting', 'sound-design-effects'],
    requiresVersion: 'Audacity 3.7.4 or later',
  },
  {
    id: 'musefx',
    name: 'MuseFX',
    description: 'An essential collection of mix effects',
    categories: ['mixing-mastering'],
  },
  {
    id: 'borealis-le',
    name: 'BOREALIS-LE',
    description: 'FREE, Light Edition of BOREALIS',
    categories: ['reverb-delay', 'sound-design-effects'],
  },
  {
    id: 'shape-it',
    name: 'Shape It',
    description: 'Parametric 10 band EQ',
    categories: ['mixing-mastering', 'tone-dynamics'],
  },
  {
    id: 'place-it',
    name: 'Place It',
    description: '10 band parametric EQ for sound design',
    categories: ['mixing-mastering', 'sound-design-effects'],
  },
  {
    id: 'neutone-fx',
    name: 'Neutone FX',
    description: 'AI powered instruments and effects',
    categories: ['sound-design-effects'],
  },
  {
    id: 'graillon-3',
    name: 'Graillon 3',
    description: 'Real-time vocal tuner',
    categories: ['voice-podcasting'],
  },
  {
    id: 'inner-pitch-2',
    name: 'Inner Pitch 2',
    description: 'Creative pitch-shifting plugin',
    categories: ['voice-podcasting', 'sound-design-effects'],
  },
];

export const PluginBrowserDialog: React.FC<PluginBrowserDialogProps> = ({
  isOpen,
  onClose,
  currentCategory = 'all',
  onCategoryChange,
  os = 'macos',
  className = '',
}) => {
  const [selectedCategory, setSelectedCategory] = useState<PluginCategory>(currentCategory);

  const handleCategoryChange = (category: PluginCategory) => {
    setSelectedCategory(category);
    onCategoryChange?.(category);
  };

  // Filter plugins based on selected category
  const filteredPlugins = useMemo(() => {
    if (selectedCategory === 'all') {
      return allPlugins;
    }
    return allPlugins.filter((plugin) => plugin.categories.includes(selectedCategory));
  }, [selectedCategory]);

  if (!isOpen) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Get Effects"
      os={os}
      className={`plugin-browser-dialog ${className}`}
      width="880px"
      maximizable={true}
      closeOnClickOutside={false}
    >
      {/* Filter Bar */}
      <div className="plugin-browser-dialog__filters">
        <div className="plugin-browser-dialog__categories">
          {categories.map((category) => (
            <FilterChip
              key={category.id}
              label={category.label}
              selected={selectedCategory === category.id}
              onClick={() => handleCategoryChange(category.id)}
            />
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="plugin-browser-dialog__body">
        <div className="plugin-browser-dialog__scroll-container">
          <div className="plugin-browser-dialog__grid">
            {filteredPlugins.map((plugin) => (
              <div key={plugin.id} className="plugin-card">
                <div className="plugin-card__image">
                  {/* Placeholder for plugin image */}
                  <div className="plugin-card__image-placeholder" />
                </div>
                <div className="plugin-card__content">
                  <h3 className="plugin-card__name">{plugin.name}</h3>
                  <p className="plugin-card__description">{plugin.description}</p>
                  {plugin.requiresVersion && (
                    <p className="plugin-card__version">
                      IMPORTANT: Requires {plugin.requiresVersion}
                    </p>
                  )}
                  <div className="plugin-card__actions">
                    <Button variant="primary" size="small">
                      Get it on MuseHub
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="plugin-browser-dialog__footer">
        <div className="plugin-browser-dialog__footer-left">
          <Button
            variant="secondary"
            onClick={() => {
              console.log('Become a partner clicked');
              // In real implementation, would open external link or partner page
            }}
          >
            Become a Partner
          </Button>
        </div>
        <div className="plugin-browser-dialog__footer-right">
          <Button variant="secondary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default PluginBrowserDialog;
