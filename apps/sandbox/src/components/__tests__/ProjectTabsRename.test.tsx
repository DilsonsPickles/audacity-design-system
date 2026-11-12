import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { ThemeProvider } from '@audacity-ui/components';
import { ProjectTabs } from '../ProjectBarTools';

afterEach(cleanup);

// A double-click on a project tab renames its project (2026-11-12)
function renderTabs(onRenameProject = vi.fn()) {
  const utils = render(
    <ThemeProvider>
      <ProjectTabs
        activeMenuItem="project"
        onNavigate={() => {}}
        projectTabs={[{ id: 'a', title: 'First' }, { id: 'b', title: 'Second' }]}
        activeProjectId="a"
        onSelectProject={() => {}}
        onRenameProject={onRenameProject}
      />
    </ThemeProvider>,
  );
  return { ...utils, onRenameProject };
}

describe('renaming a project from its tab', () => {
  it('a double-click opens the field; Enter keeps the new name', () => {
    const { container, onRenameProject } = renderTabs();
    fireEvent.doubleClick(container.querySelector('[data-project-tab="b"] .tab') as HTMLElement);
    const field = container.querySelector('[data-project-tab-rename]') as HTMLInputElement;
    expect(field.value).toBe('Second');
    fireEvent.change(field, { target: { value: '  Mix down  ' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(onRenameProject).toHaveBeenCalledWith('b', 'Mix down');
    expect(container.querySelector('[data-project-tab-rename]')).toBeNull();
  });

  it('Escape, a blank name or the same name change nothing', () => {
    const { container, onRenameProject } = renderTabs();
    const open = () => {
      fireEvent.doubleClick(container.querySelector('[data-project-tab="a"] .tab') as HTMLElement);
      return container.querySelector('[data-project-tab-rename]') as HTMLInputElement;
    };
    let field = open();
    fireEvent.change(field, { target: { value: 'Other' } });
    fireEvent.keyDown(field, { key: 'Escape' });
    field = open();
    fireEvent.change(field, { target: { value: '   ' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    field = open();
    fireEvent.blur(field);
    expect(onRenameProject).not.toHaveBeenCalled();
  });
});
