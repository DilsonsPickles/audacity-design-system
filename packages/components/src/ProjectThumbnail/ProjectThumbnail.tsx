import React from 'react';
import { Icon } from '../Icon';
import './ProjectThumbnail.css';

export interface ProjectThumbnailProps {
  /**
   * Project title
   */
  title?: string;
  /**
   * Date/timestamp text (e.g., "TODAY", "YESTERDAY")
   */
  dateText?: string;
  /**
   * Project thumbnail image URL
   */
  thumbnailUrl?: string;
  /**
   * Whether this is the "New project" card
   */
  isNewProject?: boolean;
  /**
   * Whether this is a cloud project (shows cloud icon badge)
   */
  isCloudProject?: boolean;
  /**
   * Click handler
   */
  onClick?: () => void;
  /**
   * Optional className for custom styling
   */
  className?: string;
}

/**
 * ProjectThumbnail component
 * - Shows project preview with title and date
 * - Special "New project" variant with plus icon
 * - Aspect ratio: 242/130 (~1.86:1)
 */
export function ProjectThumbnail({
  title = 'New Project',
  dateText = 'TODAY',
  thumbnailUrl,
  isNewProject = false,
  isCloudProject = false,
  onClick,
  className = '',
}: ProjectThumbnailProps) {
  return (
    <button
      className={`project-thumbnail ${isNewProject ? 'project-thumbnail--new' : ''} ${className}`}
      onClick={onClick}
      type="button"
    >
      <div className="project-thumbnail__image">
        {isNewProject ? (
          <Icon name="plus" size={40} className="project-thumbnail__plus-icon" />
        ) : thumbnailUrl ? (
          <img src={thumbnailUrl} alt={title} className="project-thumbnail__img" />
        ) : (
          <div className="project-thumbnail__placeholder" />
        )}
        {isCloudProject && !isNewProject && (
          <div className="project-thumbnail__cloud-badge">
            <Icon name="cloud" size={16} />
          </div>
        )}
      </div>
      <div className="project-thumbnail__info">
        <div className="project-thumbnail__title">{title}</div>
        {!isNewProject && <div className="project-thumbnail__date">{dateText}</div>}
      </div>
    </button>
  );
}
