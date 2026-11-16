import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '@audacity-ui/components';
import { ProjectTabRail, badgeColour, projectInitials, RAIL_COLLAPSED_PX } from '../ProjectTabRail';

afterEach(cleanup);

// Vertical project tabs, Firefox's (2026-11-16)
function renderRail(over: Partial<React.ComponentProps<typeof ProjectTabRail>> = {}) {
  const props = {
    inProject: true,
    onHome: vi.fn(),
    projects: [{ id: 'p1', title: 'Drum demo' }, { id: 'p2', title: 'Interview take two' }],
    activeProjectId: 'p1',
    onSelectProject: vi.fn(),
    onCloseProject: vi.fn(),
    onReorderProjects: vi.fn(),
    onRenameProject: vi.fn(),
    onNewProject: vi.fn(),
    pinned: false,
    onPinnedChange: vi.fn(),
    width: 220,
    onWidthChange: vi.fn(),
    onRailMenu: vi.fn(),
    ...over,
  };
  const utils = render(<ThemeProvider><ProjectTabRail {...props} /></ThemeProvider>);
  const button = (label: string) => utils.container.querySelector(`.project-rail__button[aria-label="${label}"]`) as HTMLElement;
  return { ...utils, props, button };
}

describe('ProjectTabRail', () => {
  it('badges: the initials of the first two words, and a colour stable for the id', () => {
    expect(projectInitials('Drum demo')).toBe('DD');
    expect(projectInitials('interview')).toBe('I');
    expect(projectInitials('  ')).toBe('?');
    expect(badgeColour('p1')).toBe(badgeColour('p1'));
  });

  it('collapsed it is 48px, the active project marked; a click switches, Home and + do their jobs', () => {
    const { container, props, button } = renderRail();
    const rail = container.querySelector('[data-project-rail]') as HTMLElement;
    expect(rail.style.width).toBe(`${RAIL_COLLAPSED_PX}px`);
    expect(button('Drum demo').getAttribute('aria-current')).toBe('page');
    expect(container.querySelector('[data-rail-project="p1"] .project-rail__initials')?.textContent).toBe('DD');
    fireEvent.click(button('Interview take two'));
    expect(props.onSelectProject).toHaveBeenCalledWith('p2');
    fireEvent.click(button('Home'));
    expect(props.onHome).toHaveBeenCalled();
    fireEvent.click(button('New project'));
    expect(props.onNewProject).toHaveBeenCalled();
  });

  it('pinned it takes its width, shows the close buttons and the pin; a right-click asks for its menu', () => {
    const { container, props } = renderRail({ pinned: true, width: 260 });
    const rail = container.querySelector('[data-project-rail]') as HTMLElement;
    expect(rail.style.width).toBe('260px');
    fireEvent.click(container.querySelector('[data-rail-close="p2"]') as HTMLElement);
    expect(props.onCloseProject).toHaveBeenCalledWith('p2');
    fireEvent.click(container.querySelector('.project-rail__pin') as HTMLElement);
    expect(props.onPinnedChange).toHaveBeenCalledWith(false);
    fireEvent.contextMenu(rail, { clientX: 5, clientY: 9 });
    expect(props.onRailMenu).toHaveBeenCalledWith({ x: 5, y: 9 });
  });

  it('a double-click renames (expanded); Enter keeps the trimmed name', () => {
    const { container, props } = renderRail({ pinned: true });
    fireEvent.doubleClick(container.querySelector('[data-rail-project="p2"]') as HTMLElement);
    const input = container.querySelector('[data-rail-rename]') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '  Take two  ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(props.onRenameProject).toHaveBeenCalledWith('p2', 'Take two');
  });
});
