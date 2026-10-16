import { todayStr } from './dates.js';
import { withBackupStamp } from './reminder.js';

export function downloadBackup(state, now = new Date()) {
  const blob = new Blob([JSON.stringify(withBackupStamp(state, now), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `submanager-backup-${todayStr(now)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
