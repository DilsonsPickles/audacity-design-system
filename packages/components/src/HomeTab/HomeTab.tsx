import React from 'react';
import { SearchField } from '../SearchField';
import { Icon } from '../Icon';
import { ProjectThumbnail } from '../ProjectThumbnail';
import { useTheme } from '../ThemeProvider';
import './HomeTab.css';

export interface HomeTabProps {
  isSignedIn?: boolean;
  onCreateAccount?: () => void;
  onSignIn?: () => void;
  onNewProject?: () => void;
  onOpenOther?: () => void;
  onSearch?: (query: string) => void;
  className?: string;
}

export function HomeTab({
  isSignedIn = false,
  onCreateAccount,
  onSignIn,
  onNewProject,
  onOpenOther,
  onSearch,
  className = '',
}: HomeTabProps) {
  const { theme } = useTheme();
  const [activeSidebarItem, setActiveSidebarItem] = React.useState<'my-accounts' | 'project' | 'learn'>('project');
  const [activeSection, setActiveSection] = React.useState<'cloud-projects' | 'new-recent' | 'cloud-audio'>('new-recent');
  const [searchQuery, setSearchQuery] = React.useState('');

  const style = {
    '--home-tab-bg': theme.background.surface.default,
    '--home-tab-sidebar-bg': theme.background.surface.default,
    '--home-tab-sidebar-border': theme.border.default,
    '--home-tab-sidebar-item-text': theme.foreground.text.primary,
    '--home-tab-sidebar-item-hover-bg': theme.background.surface.hover,
    '--home-tab-sidebar-item-active-bg': theme.background.surface.subtle,
    '--home-tab-content-bg': theme.background.surface.elevated,
    '--home-tab-header-text': theme.foreground.text.primary,
    '--home-tab-section-btn-bg': theme.border.focus,
    '--home-tab-projects-grid-bg': theme.background.surface.inset,
    '--home-tab-card-bg': theme.background.surface.elevated,
    '--home-tab-card-border': theme.border.default,
    '--home-tab-card-hover-bg': theme.background.surface.hover,
    '--home-tab-card-text': theme.foreground.text.primary,
    '--home-tab-card-meta': theme.foreground.text.secondary,
    '--home-tab-card-link': theme.border.focus,
    '--home-tab-footer-bg': theme.background.surface.hover,
    '--home-tab-footer-border': theme.border.default,
    '--home-tab-footer-card-bg': theme.background.surface.elevated,
    '--home-tab-footer-card-border': theme.border.default,
    '--home-tab-footer-text': theme.foreground.text.primary,
    '--home-tab-footer-btn-bg': theme.background.surface.subtle,
    '--home-tab-placeholder-bg': theme.background.surface.subtle,
  } as React.CSSProperties;

  return (
    <div className={`home-tab ${className}`} style={style}>
      {/* Left Sidebar */}
      <div className="home-tab__sidebar">
        <button
          className={`home-tab__sidebar-item ${activeSidebarItem === 'my-accounts' ? 'home-tab__sidebar-item--active' : ''}`}
          onClick={() => setActiveSidebarItem('my-accounts')}
        >
          <Icon name="user" size={20} className="home-tab__sidebar-icon" />
          <span className="home-tab__sidebar-label">My accounts</span>
        </button>
        <button
          className={`home-tab__sidebar-item ${activeSidebarItem === 'project' ? 'home-tab__sidebar-item--active' : ''}`}
          onClick={() => {
            setActiveSidebarItem('project');
            setActiveSection('new-recent');
          }}
        >
          <Icon name="menu" size={20} className="home-tab__sidebar-icon" />
          <span className="home-tab__sidebar-label">Project</span>
        </button>
        <button
          className={`home-tab__sidebar-item ${activeSidebarItem === 'learn' ? 'home-tab__sidebar-item--active' : ''}`}
          onClick={() => setActiveSidebarItem('learn')}
        >
          <Icon name="book" size={20} className="home-tab__sidebar-icon" />
          <span className="home-tab__sidebar-label">Learn</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="home-tab__main">
        <div className="home-tab__content">
          {/* Header - Only show on Project page */}
          {activeSidebarItem === 'project' && (
            <>
              <div className="home-tab__header">
                <h1 className="home-tab__title">Projects</h1>
                <SearchField
                  value={searchQuery}
                  onChange={(value) => {
                    setSearchQuery(value);
                    onSearch?.(value);
                  }}
                  placeholder="Search"
                  width={200}
                />
              </div>

              {/* Tabs */}
              <div className="home-tab__tabs">
                <div className="home-tab__tabs-left">
                  <button
                    className={`home-tab__tab ${activeSection === 'new-recent' ? 'home-tab__tab--active' : ''}`}
                    onClick={() => setActiveSection('new-recent')}
                  >
                    <span>New & recent</span>
                    {activeSection === 'new-recent' && <div className="home-tab__tab-underline" />}
                  </button>
                  <button
                    className={`home-tab__tab ${activeSection === 'cloud-projects' ? 'home-tab__tab--active' : ''}`}
                    onClick={() => setActiveSection('cloud-projects')}
                  >
                    <span>Cloud projects</span>
                    {activeSection === 'cloud-projects' && <div className="home-tab__tab-underline" />}
                  </button>
                  <button
                    className={`home-tab__tab ${activeSection === 'cloud-audio' ? 'home-tab__tab--active' : ''}`}
                    onClick={() => setActiveSection('cloud-audio')}
                  >
                    <span>Cloud audio files</span>
                    {activeSection === 'cloud-audio' && <div className="home-tab__tab-underline" />}
                  </button>
                </div>
                <div className="home-tab__tabs-right">
                  <button className="home-tab__icon-btn home-tab__icon-btn--active">
                    <Icon name="menu" size={16} />
                  </button>
                  <button className="home-tab__icon-btn">
                    <Icon name="menu" size={16} />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Content Area */}
          {activeSidebarItem === 'project' && (
            <>
              {/* New & recent tab - show local files + cloud projects (if signed in) */}
              {activeSection === 'new-recent' && (
                <div className="home-tab__projects-grid">
                  <ProjectThumbnail
                    isNewProject
                    title="New project"
                    onClick={onNewProject}
                  />
                  {isSignedIn && (
                    <ProjectThumbnail
                      title="New Project 2025-10-21 10-57-03-23 03"
                      dateText="TODAY"
                      thumbnailUrl="http://localhost:3845/assets/329180063227bc117665a470bbac924319d222aa.png"
                      isCloudProject
                    />
                  )}
                  <ProjectThumbnail
                    title="New Project 2025-10-21 10-57-03-23 03"
                    dateText="TODAY"
                    thumbnailUrl="http://localhost:3845/assets/329180063227bc117665a470bbac924319d222aa.png"
                  />
                  <ProjectThumbnail
                    title="New Project 2025-10-21 10-57-03-23 03"
                    dateText="TODAY"
                    thumbnailUrl="http://localhost:3845/assets/329180063227bc117665a470bbac924319d222aa.png"
                  />
                  <ProjectThumbnail
                    title="New Project 2025-10-21 10-57-03-23 03"
                    dateText="TODAY"
                    thumbnailUrl="http://localhost:3845/assets/329180063227bc117665a470bbac924319d222aa.png"
                  />
                  <ProjectThumbnail
                    title="New Project 2025-10-21 10-57-03-23 03"
                    dateText="TODAY"
                    thumbnailUrl="http://localhost:3845/assets/329180063227bc117665a470bbac924319d222aa.png"
                  />
                </div>
              )}

              {/* Cloud projects tab - show sign-in prompt if not signed in */}
              {activeSection === 'cloud-projects' && !isSignedIn && (
                <div className="home-tab__empty-state">
                  <div className="home-tab__empty-text">
                    <div className="home-tab__empty-title">You are not signed in</div>
                    <div className="home-tab__empty-description">
                      Log in or create a new account <a href="#">audio.com</a> to view cloud saved projects
                    </div>
                  </div>
                  <div className="home-tab__empty-actions">
                    <button className="home-tab__btn" onClick={onCreateAccount}>
                      Create account
                    </button>
                    <button className="home-tab__btn" onClick={onSignIn}>
                      Sign in
                    </button>
                  </div>
                </div>
              )}

              {/* Cloud audio files tab - show sign-in prompt if not signed in */}
              {activeSection === 'cloud-audio' && !isSignedIn && (
                <div className="home-tab__empty-state">
                  <div className="home-tab__empty-text">
                    <div className="home-tab__empty-title">You are not signed in</div>
                    <div className="home-tab__empty-description">
                      Log in or create a new account <a href="#">audio.com</a> to view cloud audio files
                    </div>
                  </div>
                  <div className="home-tab__empty-actions">
                    <button className="home-tab__btn" onClick={onCreateAccount}>
                      Create account
                    </button>
                    <button className="home-tab__btn" onClick={onSignIn}>
                      Sign in
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* My accounts page */}
          {activeSidebarItem === 'my-accounts' && (
            <div className="home-tab__empty-state">
              <div className="home-tab__empty-text">
                <div className="home-tab__empty-title">My accounts</div>
                <div className="home-tab__empty-description">
                  Account settings and profile information
                </div>
              </div>
            </div>
          )}

          {/* Learn page */}
          {activeSidebarItem === 'learn' && (
            <div className="home-tab__empty-state">
              <div className="home-tab__empty-text">
                <div className="home-tab__empty-title">Learn</div>
                <div className="home-tab__empty-description">
                  Tutorials and learning resources
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="home-tab__footer">
          <button className="home-tab__btn">Project manager (online)</button>
          <div className="home-tab__footer-right">
            <button className="home-tab__btn" onClick={onNewProject}>New</button>
            <button className="home-tab__btn" onClick={onOpenOther}>Open other...</button>
          </div>
        </div>
      </div>
    </div>
  );
}
