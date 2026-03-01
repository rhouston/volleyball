'use client';

import { useMemo, useState } from 'react';
import styles from './workspace.module.css';

type Grade = {
  id: string;
  name: string;
  category: string;
};

type Team = {
  id: string;
  name: string;
  gradeId: string;
};

type OperationLog = {
  id: string;
  tone: 'ok' | 'error' | 'info';
  message: string;
};

type CreateSeasonResponse = {
  season: {
    id: string;
    name: string;
    status: string;
  };
  grades: Grade[];
};

const roleOptions = ['platform_admin', 'grade_admin', 'team_manager', 'player'] as const;

type RoleOption = (typeof roleOptions)[number];

async function parseJsonSafe(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function AdminWorkspace() {
  const [actorRole, setActorRole] = useState<RoleOption>('platform_admin');
  const [actorUserId, setActorUserId] = useState('admin-local');

  const [seasonName, setSeasonName] = useState('2026 Community Season');
  const [seasonYear, setSeasonYear] = useState('2026');
  const [startDate, setStartDate] = useState('2026-04-01');
  const [endDate, setEndDate] = useState('2026-06-30');
  const [mixedNight, setMixedNight] = useState('3');
  const [ladiesMensNight, setLadiesMensNight] = useState('5');
  const [seasonId, setSeasonId] = useState('');
  const [seasonStatus, setSeasonStatus] = useState('DRAFT');

  const [grades, setGrades] = useState<Grade[]>([]);
  const [teamName, setTeamName] = useState('');
  const [teamGradeId, setTeamGradeId] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);

  const [finalsFormat, setFinalsFormat] = useState<'simple_top4' | 'major_minor'>('simple_top4');
  const [excludedDate, setExcludedDate] = useState('');

  const [fixtureCount, setFixtureCount] = useState(0);
  const [dutyCount, setDutyCount] = useState(0);
  const [finalsCount, setFinalsCount] = useState(0);
  const [importAccepted, setImportAccepted] = useState(0);
  const [importCommitted, setImportCommitted] = useState(0);

  const [busy, setBusy] = useState(false);
  const [logs, setLogs] = useState<OperationLog[]>([]);

  const selectedGradeName = useMemo(() => grades.find((grade) => grade.id === teamGradeId)?.name ?? '', [grades, teamGradeId]);

  function addLog(tone: OperationLog['tone'], message: string) {
    setLogs((previous) => [{ id: crypto.randomUUID(), tone, message }, ...previous].slice(0, 16));
  }

  function actorHeaders(roleOverride?: RoleOption) {
    const role = roleOverride ?? actorRole;

    return {
      'content-type': 'application/json',
      'x-user-id': actorUserId,
      'x-user-email': `${actorUserId}@local.test`,
      'x-user-role': role,
    };
  }

  async function handleCreateSeason() {
    setBusy(true);

    try {
      const response = await fetch('/api/v1/seasons', {
        method: 'POST',
        headers: actorHeaders('platform_admin'),
        body: JSON.stringify({
          organizationId: 'org-1',
          name: seasonName,
          year: Number(seasonYear),
          startDate,
          endDate,
          mixedNight: Number(mixedNight),
          ladiesMensNight: Number(ladiesMensNight),
        }),
      });

      const payload = (await parseJsonSafe(response)) as CreateSeasonResponse | { message?: string } | null;

      if (!response.ok || !payload || !('season' in payload)) {
        addLog('error', `Create season failed (${response.status}).`);
        return;
      }

      setSeasonId(payload.season.id);
      setSeasonStatus(payload.season.status);
      setGrades(payload.grades);
      setTeamGradeId(payload.grades[0]?.id ?? '');
      addLog('ok', `Season created: ${payload.season.name} (${payload.season.id}).`);
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdateSeasonSettings() {
    if (!seasonId) {
      addLog('error', 'Create a season before updating settings.');
      return;
    }

    setBusy(true);

    try {
      const excludedDates = excludedDate ? [excludedDate] : [];
      const response = await fetch(`/api/v1/seasons/${seasonId}/settings`, {
        method: 'PATCH',
        headers: actorHeaders('grade_admin'),
        body: JSON.stringify({ finalsFormat, excludedDates }),
      });

      if (!response.ok) {
        addLog('error', `Update settings failed (${response.status}).`);
        return;
      }

      addLog('ok', `Season settings updated (${finalsFormat}).`);
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateTeam() {
    if (!seasonId || !teamGradeId || !teamName.trim()) {
      addLog('error', 'Season, grade, and team name are required.');
      return;
    }

    setBusy(true);

    try {
      const response = await fetch('/api/v1/teams', {
        method: 'POST',
        headers: actorHeaders('team_manager'),
        body: JSON.stringify({
          seasonId,
          gradeId: teamGradeId,
          name: teamName.trim(),
        }),
      });

      const payload = (await parseJsonSafe(response)) as { team?: Team } | null;

      if (!response.ok || !payload?.team) {
        addLog('error', `Create team failed (${response.status}).`);
        return;
      }

      const createdTeam = payload.team;
      setTeams((previous) => [...previous, createdTeam]);
      setTeamName('');
      addLog('ok', `Team created: ${createdTeam.name}.`);
    } finally {
      setBusy(false);
    }
  }

  async function handleSeasonAction(endpoint: string, role: RoleOption, successMessage: string) {
    if (!seasonId) {
      addLog('error', 'Create a season first.');
      return;
    }

    setBusy(true);

    try {
      const response = await fetch(`/api/v1/seasons/${seasonId}/${endpoint}`, {
        method: 'POST',
        headers: actorHeaders(role),
      });

      const payload = (await parseJsonSafe(response)) as
        | { fixtures?: unknown[]; duties?: unknown[]; finals?: unknown[]; season?: { status: string } }
        | null;

      if (!response.ok) {
        addLog('error', `${successMessage} failed (${response.status}).`);
        return;
      }

      if (payload?.fixtures) {
        setFixtureCount(payload.fixtures.length);
      }

      if (payload?.duties) {
        setDutyCount(payload.duties.length);
      }

      if (payload?.finals) {
        setFinalsCount(payload.finals.length);
      }

      if (payload?.season?.status) {
        setSeasonStatus(payload.season.status);
      }

      addLog('ok', successMessage);
    } finally {
      setBusy(false);
    }
  }

  async function handleImportDryRun() {
    setBusy(true);

    try {
      const response = await fetch('/api/v1/import/dry-run', {
        method: 'POST',
        headers: actorHeaders('grade_admin'),
        body: JSON.stringify({
          type: 'teams',
          rows: teams.map((team) => ({ name: team.name, gradeId: team.gradeId, seasonId })),
        }),
      });

      const payload = (await parseJsonSafe(response)) as
        | {
            result?: {
              accepted: number;
              rejected: number;
            };
          }
        | null;

      if (!response.ok || !payload?.result) {
        addLog('error', `Import dry-run failed (${response.status}).`);
        return;
      }

      setImportAccepted(payload.result.accepted);
      addLog('ok', `Import dry-run accepted ${payload.result.accepted} rows.`);
    } finally {
      setBusy(false);
    }
  }

  async function handleImportCommit() {
    setBusy(true);

    try {
      const response = await fetch('/api/v1/import/commit', {
        method: 'POST',
        headers: actorHeaders('grade_admin'),
        body: JSON.stringify({
          type: 'teams',
          rows: teams.map((team) => ({ name: team.name, gradeId: team.gradeId, seasonId })),
        }),
      });

      const payload = (await parseJsonSafe(response)) as
        | {
            result?: {
              imported: number;
            };
          }
        | null;

      if (!response.ok || !payload?.result) {
        addLog('error', `Import commit failed (${response.status}).`);
        return;
      }

      setImportCommitted(payload.result.imported);
      addLog('ok', `Import committed ${payload.result.imported} rows.`);
    } finally {
      setBusy(false);
    }
  }

  async function handleQueueNotifications() {
    setBusy(true);

    try {
      const response = await fetch('/api/v1/notifications', {
        method: 'POST',
        headers: actorHeaders('grade_admin'),
        body: JSON.stringify({
          recipientUserId: actorUserId,
          message: `Season ${seasonName} fixture update is ready.`,
        }),
      });

      if (!response.ok) {
        addLog('error', `Queue notification failed (${response.status}).`);
        return;
      }

      addLog('ok', 'Notification queued.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>Admin Workspace</h1>
        <p>Build and publish a full season setup flow from one operational console.</p>
      </header>

      <section className={styles.card}>
        <h2>Session Context</h2>
        <div className={styles.fieldGrid}>
          <label className={styles.fieldLabel} htmlFor="role-select">
            Role
            <select id="role-select" value={actorRole} onChange={(event) => setActorRole(event.target.value as RoleOption)}>
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.fieldLabel} htmlFor="actor-user-id">
            User Id
            <input id="actor-user-id" value={actorUserId} onChange={(event) => setActorUserId(event.target.value)} />
          </label>
        </div>
      </section>

      <section className={styles.card}>
        <h2>Season Setup</h2>
        <div className={styles.fieldGrid}>
          <label className={styles.fieldLabel} htmlFor="season-name">
            Season Name
            <input id="season-name" value={seasonName} onChange={(event) => setSeasonName(event.target.value)} />
          </label>

          <label className={styles.fieldLabel} htmlFor="season-year">
            Year
            <input id="season-year" value={seasonYear} onChange={(event) => setSeasonYear(event.target.value)} />
          </label>

          <label className={styles.fieldLabel} htmlFor="start-date">
            Start Date
            <input id="start-date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </label>

          <label className={styles.fieldLabel} htmlFor="end-date">
            End Date
            <input id="end-date" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </label>

          <label className={styles.fieldLabel} htmlFor="mixed-night">
            Mixed Night
            <input id="mixed-night" value={mixedNight} onChange={(event) => setMixedNight(event.target.value)} />
          </label>

          <label className={styles.fieldLabel} htmlFor="ladies-mens-night">
            Ladies/Mens Night
            <input id="ladies-mens-night" value={ladiesMensNight} onChange={(event) => setLadiesMensNight(event.target.value)} />
          </label>
        </div>

        <div className={styles.actionRow}>
          <button type="button" onClick={handleCreateSeason} disabled={busy}>
            Create Season
          </button>
          <span className={styles.muted}>Season Id: {seasonId || 'not created yet'}</span>
          <span className={styles.muted}>Status: {seasonStatus}</span>
        </div>

        <div className={styles.fieldGrid}>
          <label className={styles.fieldLabel} htmlFor="finals-format">
            Finals Format
            <select
              id="finals-format"
              value={finalsFormat}
              onChange={(event) => setFinalsFormat(event.target.value as 'simple_top4' | 'major_minor')}
            >
              <option value="simple_top4">simple_top4</option>
              <option value="major_minor">major_minor</option>
            </select>
          </label>

          <label className={styles.fieldLabel} htmlFor="excluded-date">
            Excluded Date
            <input id="excluded-date" type="date" value={excludedDate} onChange={(event) => setExcludedDate(event.target.value)} />
          </label>
        </div>

        <div className={styles.actionRow}>
          <button type="button" onClick={handleUpdateSeasonSettings} disabled={busy || !seasonId}>
            Save Season Settings
          </button>
        </div>
      </section>

      <section className={styles.card}>
        <h2>Team Setup</h2>
        <div className={styles.fieldGrid}>
          <label className={styles.fieldLabel} htmlFor="team-name">
            Team Name
            <input id="team-name" value={teamName} onChange={(event) => setTeamName(event.target.value)} />
          </label>

          <label className={styles.fieldLabel} htmlFor="team-grade">
            Grade
            <select id="team-grade" value={teamGradeId} onChange={(event) => setTeamGradeId(event.target.value)}>
              <option value="">Select a grade</option>
              {grades.map((grade) => (
                <option key={grade.id} value={grade.id}>
                  {grade.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className={styles.actionRow}>
          <button type="button" onClick={handleCreateTeam} disabled={busy || !seasonId}>
            Create Team
          </button>
          <span className={styles.muted}>{selectedGradeName ? `Current grade: ${selectedGradeName}` : 'No grade selected'}</span>
        </div>

        <ul className={styles.inlineList}>
          {teams.map((team) => (
            <li key={team.id}>{team.name}</li>
          ))}
          {teams.length === 0 ? <li className={styles.muted}>No teams added yet.</li> : null}
        </ul>
      </section>

      <section className={styles.card}>
        <h2>Generation and Publication</h2>
        <div className={styles.actionRow}>
          <button type="button" onClick={() => handleSeasonAction('publish', 'grade_admin', 'Season published.')} disabled={busy || !seasonId}>
            Publish Season
          </button>
          <button
            type="button"
            onClick={() => handleSeasonAction('generate-fixtures', 'grade_admin', 'Fixtures generated.')}
            disabled={busy || !seasonId}
          >
            Generate Fixtures
          </button>
          <button
            type="button"
            onClick={() => handleSeasonAction('generate-duties', 'grade_admin', 'Duties generated.')}
            disabled={busy || !seasonId}
          >
            Generate Duties
          </button>
          <button
            type="button"
            onClick={() => handleSeasonAction('finals/generate', 'grade_admin', 'Finals generated.')}
            disabled={busy || !seasonId}
          >
            Generate Finals
          </button>
        </div>

        <div className={styles.metrics}>
          <span>Fixtures: {fixtureCount}</span>
          <span>Duties: {dutyCount}</span>
          <span>Finals: {finalsCount}</span>
        </div>
      </section>

      <section className={styles.card}>
        <h2>Import and Notifications</h2>
        <div className={styles.actionRow}>
          <button type="button" onClick={handleImportDryRun} disabled={busy}>
            Import Dry-Run
          </button>
          <button type="button" onClick={handleImportCommit} disabled={busy}>
            Import Commit
          </button>
          <button type="button" onClick={handleQueueNotifications} disabled={busy}>
            Queue Notification
          </button>
        </div>
        <div className={styles.metrics}>
          <span>Dry-run accepted: {importAccepted}</span>
          <span>Committed rows: {importCommitted}</span>
        </div>
      </section>

      <section className={styles.card}>
        <h2>Activity Feed</h2>
        <ul className={styles.logList}>
          {logs.map((log) => (
            <li key={log.id} className={log.tone === 'error' ? styles.logError : log.tone === 'ok' ? styles.logOk : styles.logInfo}>
              {log.message}
            </li>
          ))}
          {logs.length === 0 ? <li className={styles.muted}>Actions and API responses will appear here.</li> : null}
        </ul>
      </section>
    </main>
  );
}
