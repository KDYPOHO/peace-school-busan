// Generates Firestore REST fields for test scheduling. Writes only to the local emulator when requested.
import { DEEP_APPLY_UNTIL, LECTURES } from '../www/js/config.js';
import { lectureWindow } from '../www/js/course.js';

const timestamp = value => ({ timestampValue: new Date(value).toISOString() });
const rows = LECTURES.map(lecture => {
  const { start, end, opensAt, closesAt } = lectureWindow(lecture);
  return [String(lecture.n), {
    start: timestamp(start), end: timestamp(end), opensAt: timestamp(opensAt), closesAt: timestamp(closesAt)
  }];
});
rows.push(['deep', { closesAt: timestamp(Date.parse(DEEP_APPLY_UNTIL + 'T00:00:00+09:00') + 86_400_000) }]);

if (process.argv.includes('--emulator')) {
  const base = 'http://127.0.0.1:8182/v1/projects/demo-hanbando-school/databases/(default)/documents/courseSchedule';
  for (const [id, fields] of rows) {
    const result = await fetch(base + '/' + id, {
      method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });
    if (!result.ok) throw new Error(`Emulator schedule write failed for ${id} (${result.status})`);
  }
  console.log(`Loaded ${rows.length} schedule documents in the local Firestore emulator.`);
} else {
  console.log(JSON.stringify(Object.fromEntries(rows), null, 2));
}
