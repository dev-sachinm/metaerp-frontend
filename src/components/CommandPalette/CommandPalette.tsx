/**
 * Command Palette - Global search and navigation (Cmd/Ctrl + K)
 * Powered by cmdk; fetches users/roles and filters client-side by search.
 */

import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import { Search, User, Shield, Home, UserPlus, Loader2 } from 'lucide-react';
import { useGlobalSearch, filterGlobalSearch } from '@/hooks/graphql/useCommandSearch';
import { useDebounce } from '@/hooks/useDebounce';
import './CommandPalette.css';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 200);

  const { data, isLoading } = useGlobalSearch(open);
  const filtered = useMemo(
    () => filterGlobalSearch(data, debouncedSearch),
    [data, debouncedSearch]
  );

  const handleSelect = useCallback(
    (callback: () => void) => {
      callback();
      onOpenChange(false);
      setSearch('');
    },
    [onOpenChange]
  );

  const navigationItems = [
    { label: 'Dashboard', icon: Home, path: '/' },
    { label: 'Users', icon: User, path: '/users' },
    { label: 'Create User', icon: UserPlus, path: '/users/create' },
  ];

  const hasSearchResults =
    (filtered?.users?.items?.length ?? 0) > 0 || (filtered?.getRoles?.length ?? 0) > 0;
  const showEmpty = !isLoading && !hasSearchResults && debouncedSearch.length > 0;

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Global Command Menu"
      className="command-palette"
    >
      <div className="command-input-wrapper">
        <Search className="command-icon" size={18} />
        <Command.Input
          placeholder="Search users, roles, or go to a page..."
          value={search}
          onValueChange={setSearch}
          className="command-input"
        />
      </div>

      <Command.List className="command-list">
        {showEmpty && (
          <Command.Empty className="command-empty">No results found.</Command.Empty>
        )}

        <Command.Group heading="Go to" className="command-group">
          {navigationItems.map((item) => (
            <Command.Item
              key={item.path}
              onSelect={() => handleSelect(() => navigate(item.path))}
              className="command-item"
            >
              <item.icon size={16} className="command-item-icon" />
              <span>{item.label}</span>
            </Command.Item>
          ))}
        </Command.Group>

        {filtered?.users?.items && filtered.users.items.length > 0 && (
          <Command.Group heading="Users" className="command-group">
            {filtered.users.items.map((user) => (
              <Command.Item
                key={user.id}
                onSelect={() => handleSelect(() => navigate('/users'))}
                className="command-item"
              >
                <User size={16} className="command-item-icon" />
                <div className="command-item-content">
                  <span className="command-item-label">
                    {user.email || user.username || [user.firstName, user.lastName].filter(Boolean).join(' ')}
                  </span>
                  {(user.roles?.length ?? 0) > 0 && (
                    <span className="command-item-subtitle">{user.roles.join(', ')}</span>
                  )}
                </div>
              </Command.Item>
            ))}
          </Command.Group>
        )}

        {filtered?.getRoles && filtered.getRoles.length > 0 && (
          <Command.Group heading="Roles" className="command-group">
            {filtered.getRoles.map((role) => (
              <Command.Item
                key={role.id}
                onSelect={() => handleSelect(() => navigate('/roles'))}
                className="command-item"
              >
                <Shield size={16} className="command-item-icon" />
                <div className="command-item-content">
                  <span className="command-item-label">{role.name}</span>
                  {role.description && (
                    <span className="command-item-subtitle">{role.description}</span>
                  )}
                </div>
              </Command.Item>
            ))}
          </Command.Group>
        )}

        {isLoading && open && (
          <div className="command-loading">
            <Loader2 className="animate-spin" size={16} />
            <span>Loading...</span>
          </div>
        )}
      </Command.List>

      <div className="command-footer">
        <kbd className="command-kbd">↵</kbd>
        <span>select</span>
        <kbd className="command-kbd">↑↓</kbd>
        <span>navigate</span>
        <kbd className="command-kbd">Esc</kbd>
        <span>close</span>
      </div>
    </Command.Dialog>
  );
}
