'use client';

import { useMemo, useState, type ReactNode } from 'react';
import styles from './workspace.module.css';

type Grade = {
  id: string;
  name: string;
  category: 'MIXED' | 'LADIES' | 'MENS';
  rankOrder: number;
  isActive: boolean;
};

type Court = {
  id: string;
  name: string;
  sortOrder: number;
};

type Timeslot = {
  id: string;
  label: string;
  startsAt: string;
  sortOrder: number;
};

type Team = {
  id: string;
  name: string;
  gradeId: string;
};

type Diagnostics = {
  hardConflicts: {
    count: number;
    rows: Array<{
      type: string;
      matchId: string;
      matchDate: string;
      court: string;
      timeslot: string;
      details: string;
    }>;
  };
  fairness: {
    timeslotDistributionByTeam: Array<{
      teamId: string;
      teamName: string;
      slots: Record<string, number>;
      maxSkew: number;
    }>;
    dutyDistributionByTeam: Array<{
      teamId: string;
      teamName: string;
      duties: number;
    }>;
  };
  generation: {
    lastRunAt: string | null;
    runId: string | null;
  };
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

function SectionCard(props: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className={styles.card}>
      <h2>{props.title}</h2>
      {props.subtitle ? <p className={styles.cardSubtitle}>{props.subtitle}</p> : null}
      {props.children}
    </section>
  );
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
  const [gradeName, setGradeName] = useState('Mixed D');
  const [gradeCategory, setGradeCategory] = useState<'MIXED' | 'LADIES' | 'MENS'>('MIXED');
  const [gradeRankOrder, setGradeRankOrder] = useState('6');
  const [selectedGradeId, setSelectedGradeId] = useState('');

  const [courts, setCourts] = useState<Court[]>([]);
  const [courtName, setCourtName] = useState('Court 4');
  const [courtSortOrder, setCourtSortOrder] = useState('4');
  const [selectedCourtId, setSelectedCourtId] = useState('');

  const [timeslots, setTimeslots] = useState<Timeslot[]>([]);
  const [timeslotLabel, setTimeslotLabel] = useState('Late Slot');
  const [timeslotStartsAt, setTimeslotStartsAt] = useState('20:45');
  const [timeslotSortOrder, setTimeslotSortOrder] = useState('4');
  const [selectedTimeslotId, setSelectedTimeslotId] = useState('');

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
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);

  const [busy, setBusy] = useState(false);
  const [logs, setLogs] = useState<OperationLog[]>([]);

  const selectedGradeName = useMemo(() => grades.find((grade) => grade.id === teamGradeId)?.name ?? '', [grades, teamGradeId]);

  function addLog(tone: OperationLog['tone'], message: string) {
    setLogs((previous) => [{ id: crypto.randomUUID(), tone, message }, ...previous].slice(0, 20));
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

  async function refreshInfrastructure(currentSeasonId: string) {
    const [gradesResponse, courtsResponse, timeslotsResponse] = await Promise.all([
      fetch(`/api/v1/seasons/${currentSeasonId}/grades`, { headers: actorHeaders('grade_admin') }),
      fetch(`/api/v1/seasons/${currentSeasonId}/courts`, { headers: actorHeaders('grade_admin') }),
      fetch(`/api/v1/seasons/${currentSeasonId}/timeslots`, { headers: actorHeaders('grade_admin') }),
    ]);

    if (!gradesResponse.ok || !courtsResponse.ok || !timeslotsResponse.ok) {
      addLog('error', 'Failed to refresh infrastructure data.');
      return;
    }

    const gradesPayload = (await parseJsonSafe(gradesResponse)) as { grades?: Grade[] } | null;
    const courtsPayload = (await parseJsonSafe(courtsResponse)) as { courts?: Court[] } | null;
    const timeslotsPayload = (await parseJsonSafe(timeslotsResponse)) as { timeslots?: Timeslot[] } | null;

    const nextGrades = gradesPayload?.grades ?? [];
    const nextCourts = courtsPayload?.courts ?? [];
    const nextTimeslots = timeslotsPayload?.timeslots ?? [];

    setGrades(nextGrades);
    setCourts(nextCourts);
    setTimeslots(nextTimeslots);
    setTeamGradeId((existing) => existing || nextGrades[0]?.id || '');
    setSelectedGradeId((existing) => existing || nextGrades[0]?.id || '');
    setSelectedCourtId((existing) => existing || nextCourts[0]?.id || '');
    setSelectedTimeslotId((existing) => existing || nextTimeslots[0]?.id || '');
  }

  async function refreshDiagnostics(currentSeasonId: string) {
    const response = await fetch(`/api/v1/seasons/${currentSeasonId}/generation-report`, {
      headers: actorHeaders('grade_admin'),
    });

    const payload = (await parseJsonSafe(response)) as { diagnostics?: Diagnostics } | null;

    if (!response.ok || !payload?.diagnostics) {
      addLog('error', `Diagnostics fetch failed (${response.status}).`);
      return;
    }

    setDiagnostics(payload.diagnostics);
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

      const nextSeasonId = payload.season.id;
      setSeasonId(nextSeasonId);
      setSeasonStatus(payload.season.status);
      addLog('ok', `Season created: ${payload.season.name} (${payload.season.id}).`);
      await refreshInfrastructure(nextSeasonId);
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

  async function handleCreateGrade() {
    if (!seasonId) {
      addLog('error', 'Create a season first.');
      return;
    }

    setBusy(true);

    try {
      const response = await fetch(`/api/v1/seasons/${seasonId}/grades`, {
        method: 'POST',
        headers: actorHeaders('grade_admin'),
        body: JSON.stringify({
          name: gradeName.trim(),
          category: gradeCategory,
          rankOrder: Number(gradeRankOrder),
        }),
      });

      if (!response.ok) {
        addLog('error', `Create grade failed (${response.status}).`);
        return;
      }

      addLog('ok', `Grade created: ${gradeName.trim()}.`);
      await refreshInfrastructure(seasonId);
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdateGrade() {
    if (!seasonId || !selectedGradeId) {
      addLog('error', 'Select a grade to update.');
      return;
    }

    setBusy(true);

    try {
      const response = await fetch(`/api/v1/grades/${selectedGradeId}`, {
        method: 'PATCH',
        headers: actorHeaders('grade_admin'),
        body: JSON.stringify({
          name: gradeName.trim(),
          category: gradeCategory,
          rankOrder: Number(gradeRankOrder),
        }),
      });

      if (!response.ok) {
        addLog('error', `Update grade failed (${response.status}).`);
        return;
      }

      addLog('ok', 'Grade updated.');
      await refreshInfrastructure(seasonId);
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateCourt() {
    if (!seasonId) {
      addLog('error', 'Create a season first.');
      return;
    }

    setBusy(true);

    try {
      const response = await fetch(`/api/v1/seasons/${seasonId}/courts`, {
        method: 'POST',
        headers: actorHeaders('grade_admin'),
        body: JSON.stringify({
          name: courtName.trim(),
          sortOrder: Number(courtSortOrder),
        }),
      });

      if (!response.ok) {
        addLog('error', `Create court failed (${response.status}).`);
        return;
      }

      addLog('ok', `Court created: ${courtName.trim()}.`);
      await refreshInfrastructure(seasonId);
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdateCourt() {
    if (!seasonId || !selectedCourtId) {
      addLog('error', 'Select a court to update.');
      return;
    }

    setBusy(true);

    try {
      const response = await fetch(`/api/v1/courts/${selectedCourtId}`, {
        method: 'PATCH',
        headers: actorHeaders('grade_admin'),
        body: JSON.stringify({
          name: courtName.trim(),
          sortOrder: Number(courtSortOrder),
        }),
      });

      if (!response.ok) {
        addLog('error', `Update court failed (${response.status}).`);
        return;
      }

      addLog('ok', 'Court updated.');
      await refreshInfrastructure(seasonId);
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateTimeslot() {
    if (!seasonId) {
      addLog('error', 'Create a season first.');
      return;
    }

    setBusy(true);

    try {
      const response = await fetch(`/api/v1/seasons/${seasonId}/timeslots`, {
        method: 'POST',
        headers: actorHeaders('grade_admin'),
        body: JSON.stringify({
          label: timeslotLabel.trim(),
          startsAt: timeslotStartsAt.trim(),
          sortOrder: Number(timeslotSortOrder),
        }),
      });

      if (!response.ok) {
        addLog('error', `Create timeslot failed (${response.status}).`);
        return;
      }

      addLog('ok', `Timeslot created: ${timeslotLabel.trim()}.`);
      await refreshInfrastructure(seasonId);
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdateTimeslot() {
    if (!seasonId || !selectedTimeslotId) {
      addLog('error', 'Select a timeslot to update.');
      return;
    }

    setBusy(true);

    try {
      const response = await fetch(`/api/v1/timeslots/${selectedTimeslotId}`, {
        method: 'PATCH',
        headers: actorHeaders('grade_admin'),
        body: JSON.stringify({
          label: timeslotLabel.trim(),
          startsAt: timeslotStartsAt.trim(),
          sortOrder: Number(timeslotSortOrder),
        }),
      });

      if (!response.ok) {
        addLog('error', `Update timeslot failed (${response.status}).`);
        return;
      }

      addLog('ok', 'Timeslot updated.');
      await refreshInfrastructure(seasonId);
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

      await refreshDiagnostics(seasonId);
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

      addLog('ok', 'Notification queued for cron dispatch.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>Admin Workspace</h1>
        <p>Run season setup, generation, diagnostics, import, and notifications from one mobile-first console.</p>
      </header>

      <SectionCard title="Session Context" subtitle="Role and actor identity used for every action.">
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
      </SectionCard>

      <SectionCard title="Season Setup" subtitle="Create season shell and lock scoring/finals defaults.">
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
            Mixed Night (0-6)
            <input id="mixed-night" value={mixedNight} onChange={(event) => setMixedNight(event.target.value)} />
          </label>

          <label className={styles.fieldLabel} htmlFor="ladies-mens-night">
            Ladies/Mens Night (0-6)
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
          <button type="button" onClick={() => seasonId && refreshInfrastructure(seasonId)} disabled={busy || !seasonId}>
            Refresh Infrastructure
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Grade Management" subtitle="Create and update grades without leaving admin.">
        <div className={styles.fieldGrid}>
          <label className={styles.fieldLabel} htmlFor="grade-select">
            Existing Grade
            <select id="grade-select" value={selectedGradeId} onChange={(event) => setSelectedGradeId(event.target.value)}>
              <option value="">Select a grade</option>
              {grades.map((grade) => (
                <option key={grade.id} value={grade.id}>
                  {grade.name}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.fieldLabel} htmlFor="grade-name">
            Grade Name
            <input id="grade-name" value={gradeName} onChange={(event) => setGradeName(event.target.value)} />
          </label>

          <label className={styles.fieldLabel} htmlFor="grade-category">
            Category
            <select id="grade-category" value={gradeCategory} onChange={(event) => setGradeCategory(event.target.value as Grade['category'])}>
              <option value="MIXED">MIXED</option>
              <option value="LADIES">LADIES</option>
              <option value="MENS">MENS</option>
            </select>
          </label>

          <label className={styles.fieldLabel} htmlFor="grade-rank-order">
            Rank Order
            <input id="grade-rank-order" value={gradeRankOrder} onChange={(event) => setGradeRankOrder(event.target.value)} />
          </label>
        </div>

        <div className={styles.actionRow}>
          <button type="button" onClick={handleCreateGrade} disabled={busy || !seasonId}>
            Create Grade
          </button>
          <button type="button" onClick={handleUpdateGrade} disabled={busy || !selectedGradeId}>
            Update Grade
          </button>
        </div>

        <div className={styles.metrics}>
          {grades.map((grade) => (
            <span key={grade.id}>
              {grade.name} ({grade.category})
            </span>
          ))}
          {grades.length === 0 ? <span className={styles.muted}>No grades loaded.</span> : null}
        </div>
      </SectionCard>

      <SectionCard title="Court Management" subtitle="Configure court inventory and ordering for generation.">
        <div className={styles.fieldGrid}>
          <label className={styles.fieldLabel} htmlFor="court-select">
            Existing Court
            <select id="court-select" value={selectedCourtId} onChange={(event) => setSelectedCourtId(event.target.value)}>
              <option value="">Select a court</option>
              {courts.map((court) => (
                <option key={court.id} value={court.id}>
                  {court.name}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.fieldLabel} htmlFor="court-name">
            Court Name
            <input id="court-name" value={courtName} onChange={(event) => setCourtName(event.target.value)} />
          </label>

          <label className={styles.fieldLabel} htmlFor="court-sort-order">
            Sort Order
            <input id="court-sort-order" value={courtSortOrder} onChange={(event) => setCourtSortOrder(event.target.value)} />
          </label>
        </div>

        <div className={styles.actionRow}>
          <button type="button" onClick={handleCreateCourt} disabled={busy || !seasonId}>
            Create Court
          </button>
          <button type="button" onClick={handleUpdateCourt} disabled={busy || !selectedCourtId}>
            Update Court
          </button>
        </div>

        <div className={styles.metrics}>
          {courts.map((court) => (
            <span key={court.id}>
              {court.sortOrder}. {court.name}
            </span>
          ))}
          {courts.length === 0 ? <span className={styles.muted}>No courts loaded.</span> : null}
        </div>
      </SectionCard>

      <SectionCard title="Timeslot Management" subtitle="Configure timeslots and ordering for fixture balancing.">
        <div className={styles.fieldGrid}>
          <label className={styles.fieldLabel} htmlFor="timeslot-select">
            Existing Timeslot
            <select id="timeslot-select" value={selectedTimeslotId} onChange={(event) => setSelectedTimeslotId(event.target.value)}>
              <option value="">Select a timeslot</option>
              {timeslots.map((timeslot) => (
                <option key={timeslot.id} value={timeslot.id}>
                  {timeslot.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.fieldLabel} htmlFor="timeslot-label">
            Label
            <input id="timeslot-label" value={timeslotLabel} onChange={(event) => setTimeslotLabel(event.target.value)} />
          </label>

          <label className={styles.fieldLabel} htmlFor="timeslot-starts-at">
            Starts At (HH:MM)
            <input id="timeslot-starts-at" value={timeslotStartsAt} onChange={(event) => setTimeslotStartsAt(event.target.value)} />
          </label>

          <label className={styles.fieldLabel} htmlFor="timeslot-sort-order">
            Sort Order
            <input id="timeslot-sort-order" value={timeslotSortOrder} onChange={(event) => setTimeslotSortOrder(event.target.value)} />
          </label>
        </div>

        <div className={styles.actionRow}>
          <button type="button" onClick={handleCreateTimeslot} disabled={busy || !seasonId}>
            Create Timeslot
          </button>
          <button type="button" onClick={handleUpdateTimeslot} disabled={busy || !selectedTimeslotId}>
            Update Timeslot
          </button>
        </div>

        <div className={styles.metrics}>
          {timeslots.map((timeslot) => (
            <span key={timeslot.id}>
              {timeslot.sortOrder}. {timeslot.label} {timeslot.startsAt}
            </span>
          ))}
          {timeslots.length === 0 ? <span className={styles.muted}>No timeslots loaded.</span> : null}
        </div>
      </SectionCard>

      <SectionCard title="Team Setup" subtitle="Register teams by grade and verify assignment context.">
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
      </SectionCard>

      <SectionCard title="Generation and Publication" subtitle="Run generators, publish, and inspect diagnostics.">
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
          <button type="button" onClick={() => seasonId && refreshDiagnostics(seasonId)} disabled={busy || !seasonId}>
            Refresh Diagnostics
          </button>
        </div>

        <div className={styles.metrics}>
          <span>Fixtures: {fixtureCount}</span>
          <span>Duties: {dutyCount}</span>
          <span>Finals: {finalsCount}</span>
        </div>

        <div className={styles.diagnosticsGrid}>
          <article className={styles.diagnosticCard}>
            <h3>Hard Conflicts</h3>
            <p>{diagnostics?.hardConflicts.count ?? 0}</p>
            <ul className={styles.inlineList}>
              {(diagnostics?.hardConflicts.rows ?? []).slice(0, 5).map((row) => (
                <li key={`${row.matchId}-${row.type}`}>
                  [{row.type}] {row.matchDate} {row.court} {row.timeslot}
                </li>
              ))}
            </ul>
          </article>

          <article className={styles.diagnosticCard}>
            <h3>Timeslot Fairness</h3>
            <ul className={styles.inlineList}>
              {(diagnostics?.fairness.timeslotDistributionByTeam ?? []).slice(0, 6).map((row) => (
                <li key={row.teamId}>
                  {row.teamName} skew {row.maxSkew}
                </li>
              ))}
            </ul>
          </article>

          <article className={styles.diagnosticCard}>
            <h3>Duty Fairness</h3>
            <ul className={styles.inlineList}>
              {(diagnostics?.fairness.dutyDistributionByTeam ?? []).slice(0, 6).map((row) => (
                <li key={row.teamId}>
                  {row.teamName}: {row.duties}
                </li>
              ))}
            </ul>
            <p className={styles.muted}>Last run: {diagnostics?.generation.lastRunAt ?? 'none'}</p>
          </article>
        </div>
      </SectionCard>

      <SectionCard title="Import and Notifications" subtitle="Validate import rows and enqueue notification dispatch.">
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
      </SectionCard>

      <SectionCard title="Activity Feed" subtitle="Status stream for all setup and generation actions.">
        <ul className={styles.logList}>
          {logs.map((log) => (
            <li key={log.id} className={log.tone === 'error' ? styles.logError : log.tone === 'ok' ? styles.logOk : styles.logInfo}>
              {log.tone.toUpperCase()}: {log.message}
            </li>
          ))}
          {logs.length === 0 ? <li className={styles.muted}>Actions and API responses will appear here.</li> : null}
        </ul>
      </SectionCard>
    </main>
  );
}
