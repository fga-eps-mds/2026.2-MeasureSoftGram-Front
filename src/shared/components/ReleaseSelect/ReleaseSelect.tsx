import React, { useMemo } from 'react';
import { FormControl, InputLabel, MenuItem, Select, SelectChangeEvent } from '@mui/material';
import { ReleaseItem, resolveCurrentRelease } from './resolveCurrentRelease';

export interface ReleaseSelectProps {
  releases: ReleaseItem[];
  selectedReleaseId?: number | null;
  value?: number | null;
  onReleaseChange?: (releaseId: number) => void;
  onChange?: (releaseId: number) => void;
  currentReleaseId?: number;
  label?: string;
  size?: 'small' | 'medium';
  disabled?: boolean;
  minWidth?: number | string;
}

export const ReleaseSelect: React.FC<ReleaseSelectProps> = ({
  releases,
  selectedReleaseId,
  value,
  onReleaseChange,
  onChange,
  currentReleaseId,
  label = 'Release',
  size = 'small',
  disabled = false,
  minWidth = 200,
}) => {
  const currentRelease = useMemo(() => resolveCurrentRelease(releases), [releases]);
  const activeCurrentId = currentReleaseId !== undefined ? currentReleaseId : currentRelease?.id;
  const effectiveSelectedId = selectedReleaseId !== undefined ? selectedReleaseId : (value ?? null);
  const effectiveOnChange = onReleaseChange || onChange;

  const sortedReleases = useMemo(
    () =>
      [...(releases || [])].sort(
        (a, b) => new Date(b.start_at || 0).getTime() - new Date(a.start_at || 0).getTime()
      ),
    [releases]
  );

  const handleChange = (e: SelectChangeEvent<number | string>) => {
    const numValue = Number(e.target.value);
    if (!Number.isNaN(numValue) && effectiveOnChange) {
      effectiveOnChange(numValue);
    }
  };

  const hasReleases = sortedReleases.length > 0;

  return (
    <FormControl size={size} disabled={disabled || !hasReleases} sx={{ minWidth }}>
      <InputLabel id="release-select-label">{label}</InputLabel>
      <Select
        labelId="release-select-label"
        id="release-select"
        value={hasReleases && effectiveSelectedId !== null ? effectiveSelectedId : ''}
        label={label}
        displayEmpty
        renderValue={(selected) => {
          if (!hasReleases || selected === '') {
            return 'Nenhuma release';
          }
          const found = sortedReleases.find((r) => r.id === Number(selected));
          if (!found) return '';
          const isCurrent = activeCurrentId === found.id;
          return `${found.release_name}${isCurrent ? ' (atual)' : ''}`;
        }}
        onChange={handleChange}
        sx={{
          backgroundColor: '#FFFFFF',
          borderRadius: '6px',
          fontSize: '14px',
          '& .MuiSelect-select': {
            py: '8px',
          },
        }}
      >
        {!hasReleases ? (
          <MenuItem value="" disabled>
            Nenhuma release
          </MenuItem>
        ) : (
          sortedReleases.map((release) => {
            const isCurrent = activeCurrentId === release.id;
            return (
              <MenuItem key={release.id} value={release.id}>
                {release.release_name}
                {isCurrent ? ' (atual)' : ''}
              </MenuItem>
            );
          })
        )}
      </Select>
    </FormControl>
  );
};

export default ReleaseSelect;
