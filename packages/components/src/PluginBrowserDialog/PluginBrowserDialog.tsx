import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Dialog } from '../Dialog';
import { Button } from '../Button';
import { FilterChip } from '../FilterChip';
import { PluginCard } from '../PluginCard';
import { CustomScrollbar } from '../CustomScrollbar';
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
  // Voice & Podcasting
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
  {
    id: 'voice-enhance',
    name: 'Voice Enhance Pro',
    description: 'Professional voice enhancement',
    categories: ['voice-podcasting'],
  },
  // Mixing & Mastering
  {
    id: 'musefx',
    name: 'MuseFX',
    description: 'Essential mix effects collection',
    categories: ['mixing-mastering'],
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
    description: '10 band parametric EQ',
    categories: ['mixing-mastering', 'sound-design-effects'],
  },
  // Reverb & Delay
  {
    id: 'borealis-le',
    name: 'BOREALIS-LE',
    description: 'FREE Light Edition of BOREALIS',
    categories: ['reverb-delay', 'sound-design-effects'],
  },
  {
    id: 'space-echo',
    name: 'Space Echo',
    description: 'Vintage delay and reverb',
    categories: ['reverb-delay'],
  },
  // De-Esser
  {
    id: 'smooth-vocal',
    name: 'Smooth Vocal',
    description: 'Advanced de-essing tool',
    categories: ['de-esser', 'voice-podcasting'],
  },
  {
    id: 'clarity-plus',
    name: 'Clarity Plus',
    description: 'Intelligent sibilance control',
    categories: ['de-esser'],
  },
  // Guitars & Amp
  {
    id: 'amp-studio',
    name: 'Amp Studio',
    description: 'Guitar amplifier simulation',
    categories: ['guitars-amp-simulation'],
  },
  {
    id: 'pedal-board',
    name: 'Pedal Board',
    description: 'Virtual guitar effects pedals',
    categories: ['guitars-amp-simulation'],
  },
  // Sound Design
  {
    id: 'neutone-fx',
    name: 'Neutone FX',
    description: 'AI powered sound effects',
    categories: ['sound-design-effects'],
  },
  {
    id: 'spectrum-fx',
    name: 'Spectrum FX',
    description: 'Spectral sound design tools',
    categories: ['sound-design-effects'],
  },
  // Tone & Dynamics
  {
    id: 'dynamic-master',
    name: 'Dynamic Master',
    description: 'Professional dynamics control',
    categories: ['tone-dynamics', 'mixing-mastering'],
  },
  {
    id: 'tone-shaper',
    name: 'Tone Shaper',
    description: 'Advanced tone sculpting',
    categories: ['tone-dynamics'],
  },
  // Tape & Texture
  {
    id: 'vintage-tape',
    name: 'Vintage Tape',
    description: 'Authentic tape saturation',
    categories: ['tape-texture'],
  },
  {
    id: 'analog-warmth',
    name: 'Analog Warmth',
    description: 'Classic analog character',
    categories: ['tape-texture'],
  },
  // Beats & Percussion
  {
    id: 'drum-enhancer',
    name: 'Drum Enhancer',
    description: 'Powerful drum processing',
    categories: ['beats-percussion'],
  },
  {
    id: 'beat-forge',
    name: 'Beat Forge',
    description: 'Percussion design toolkit',
    categories: ['beats-percussion'],
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
  const [pluginImages, setPluginImages] = useState<Record<string, string | undefined>>({});
  const [imagesLoading, setImagesLoading] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleCategoryChange = (category: PluginCategory) => {
    setSelectedCategory(category);
    onCategoryChange?.(category);
  };

  // Simulate API call to fetch plugin images
  useEffect(() => {
    if (!isOpen) return;

    setImagesLoading(true);
    setPluginImages({});

    // Simulate API delay (2 seconds)
    const timer = setTimeout(() => {
      const loadedImages: Record<string, string | undefined> = {};
      // In a real implementation, this would fetch from MuseHub API
      // For demo purposes, set some placeholder images
      allPlugins.forEach((plugin, index) => {
        // Alternate between showing placeholder image and gradient
        if (index % 3 === 0) {
          loadedImages[plugin.id] = 'https://via.placeholder.com/120/667eea/ffffff?text=Plugin';
        } else {
          loadedImages[plugin.id] = plugin.imageUrl; // undefined, shows gradient
        }
      });
      setPluginImages(loadedImages);
      setImagesLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [isOpen]);

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
        <div ref={scrollContainerRef} className="plugin-browser-dialog__scroll-container">
          <div className="plugin-browser-dialog__grid">
            {filteredPlugins.map((plugin) => (
              <PluginCard
                key={plugin.id}
                name={plugin.name}
                description={plugin.description}
                imageUrl={imagesLoading ? undefined : pluginImages[plugin.id]}
                requiresVersion={plugin.requiresVersion}
                onActionClick={() => {
                  console.log(`Get plugin: ${plugin.name}`);
                  // In real implementation, would open MuseHub or external link
                }}
              />
            ))}
          </div>
        </div>
        <CustomScrollbar
          contentRef={scrollContainerRef}
          orientation="vertical"
          width={16}
          backgroundColor="#ebedf0"
          borderColor="#d4d5d9"
        />
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
