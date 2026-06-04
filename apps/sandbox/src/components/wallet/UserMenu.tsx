// Signed-in chrome: "Hi, {firstName}!" greeting next to an avatar chip. Click
// the avatar to open a popover with the user's full name + email and the
// account / sign-out actions.

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMuseHub, useUser } from '../../contexts/MuseHubContext';
import './UserMenu.css';

const POPOVER_WIDTH = 260;
const POPOVER_GAP = 10;
const VIEWPORT_PAD = 12;

export interface UserMenuProps {
  /** Where "View My Account" should send the user. Defaults to the local
   *  moose-hub /account page (derived from VITE_MUSEHUB_BASE_URL). */
  accountUrl?: string;
}

export const UserMenu: React.FC<UserMenuProps> = ({
  accountUrl = `${(import.meta.env.VITE_MUSEHUB_BASE_URL as string | undefined) ?? 'http://localhost:3000'}/account`,
}) => {
  const user = useUser();
  const { signOut } = useMuseHub();
  const [open, setOpen] = useState(false);
  const avatarRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; notchLeft: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || !avatarRef.current) return;
    const update = () => {
      const rect = avatarRef.current!.getBoundingClientRect();
      const top = rect.bottom + POPOVER_GAP;
      let left = rect.right - POPOVER_WIDTH;
      if (left < VIEWPORT_PAD) left = VIEWPORT_PAD;
      if (left + POPOVER_WIDTH > window.innerWidth - VIEWPORT_PAD) {
        left = window.innerWidth - POPOVER_WIDTH - VIEWPORT_PAD;
      }
      const centre = rect.left + rect.width / 2;
      const notchLeft = Math.max(16, Math.min(POPOVER_WIDTH - 16, centre - left));
      setPos({ top, left, notchLeft });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (avatarRef.current?.contains(t)) return;
      if (popoverRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const firstName = user.name.split(/\s+/)[0];
  const userInitials = user.name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const popover = open && pos ? (
    <div
      ref={popoverRef}
      className="user-menu__popover"
      role="menu"
      aria-label="Account menu"
      style={{ top: pos.top, left: pos.left, width: POPOVER_WIDTH }}
    >
      <span className="user-menu__notch" aria-hidden="true" style={{ left: pos.notchLeft }} />

      <div className="user-menu__identity">
        <Avatar user={user} initials={userInitials} size={44} />
        <div className="user-menu__identity-meta">
          <div className="user-menu__identity-name">{user.name}</div>
          <div className="user-menu__identity-email">{user.email}</div>
        </div>
      </div>

      <div className="user-menu__divider" />

      <a
        className="user-menu__item"
        href={accountUrl}
        target="_blank"
        rel="noreferrer"
        role="menuitem"
        onClick={() => setOpen(false)}
      >
        View My Account
      </a>
      <button
        type="button"
        className="user-menu__item"
        role="menuitem"
        onClick={() => {
          setOpen(false);
          signOut();
        }}
      >
        Sign Out
      </button>
    </div>
  ) : null;

  return (
    <>
      <div className="user-menu">
        <span className="user-menu__greeting">Hi, {firstName}!</span>
        <button
          ref={avatarRef}
          type="button"
          className="user-menu__avatar-button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Account menu"
        >
          <Avatar user={user} initials={userInitials} size={32} />
        </button>
      </div>
      {popover && createPortal(popover, document.body)}
    </>
  );
};

const Avatar: React.FC<{ user: { avatarUrl?: string; name: string }; initials: string; size: number }> = ({
  user,
  initials,
  size,
}) => {
  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt=""
        className="user-menu__avatar-img"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="user-menu__avatar-fallback"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
};

export default UserMenu;
