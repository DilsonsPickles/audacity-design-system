import { DialogHeader, DialogFooter, Button } from '@audacity-ui/components';

export interface MissingPluginsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pluginNames: string[];
  os?: 'macos' | 'windows';
}

export function MissingPluginsModal({
  isOpen,
  onClose,
  pluginNames,
  os = 'macos',
}: MissingPluginsModalProps) {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 400,
          background: 'var(--background-surface-bg-surface-primary-idle, #f8f8f9)',
          border: '1px solid var(--slate-slate-400, #d2d6dd)',
          borderRadius: 8,
          boxShadow: '0 10px 30px 0 rgba(20, 21, 26, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <DialogHeader title="Missing plugins" onClose={onClose} os={os} />

        <div
          style={{
            display: 'flex',
            gap: 16,
            padding: 16,
            alignItems: 'flex-start',
          }}
        >
          <WarningIcon />
          <div
            style={{
              flex: '1 0 0',
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 14,
                fontWeight: 700,
                lineHeight: '16px',
                color: 'var(--text-txt-primary, #14151a)',
              }}
            >
              Missing plugins
            </div>
            <div
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 12,
                fontWeight: 400,
                lineHeight: '16px',
                color: 'var(--text-txt-primary, #14151a)',
              }}
            >
              Some plugins used in this project were not found:
            </div>
            <div
              style={{
                background: 'var(--background-input-bg-input-field, #ffffff)',
                border: '1px solid var(--stroke-main-stroke-primary, #d4d5d9)',
                borderRadius: 4,
                height: 120,
                padding: 12,
                overflowY: 'auto',
                boxSizing: 'border-box',
              }}
            >
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 18,
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 12,
                  fontWeight: 400,
                  lineHeight: '16px',
                  color: 'var(--text-txt-primary, #14151a)',
                  listStyleType: 'disc',
                }}
              >
                {pluginNames.map((name, i) => (
                  <li key={`${name}-${i}`}>{name}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter
          rightContent={
            <Button variant="primary" onClick={onClose}>
              OK
            </Button>
          }
        />
      </div>
    </div>
  );
}

function WarningIcon() {
  return (
    <svg
      width={48}
      height={48}
      viewBox="0 0 48 48"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path
        d="M24 6 L44 42 L4 42 Z"
        fill="none"
        stroke="var(--text-txt-primary, #14151a)"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <rect
        x={22.5}
        y={18}
        width={3}
        height={13}
        rx={1.5}
        fill="var(--text-txt-primary, #14151a)"
      />
      <circle cx={24} cy={36} r={1.8} fill="var(--text-txt-primary, #14151a)" />
    </svg>
  );
}

export default MissingPluginsModal;
