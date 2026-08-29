import { describe, it, expect } from 'vitest';
import { computeSla } from '../sla.service';

const BASE_CREATED = new Date('2026-01-01T00:00:00.000Z');

function ticket(overrides: { firstRespondedAt?: Date | null; resolvedAt?: Date | null } = {}) {
  return {
    createdAt: BASE_CREATED,
    firstRespondedAt: overrides.firstRespondedAt ?? null,
    resolvedAt: overrides.resolvedAt ?? null,
  };
}

const POLICY = { responseTargetMinutes: 60, resolutionTargetMinutes: 240, isActive: true };

describe('computeSla', () => {
  it('returns null when the policy is missing', () => {
    expect(computeSla(ticket(), null)).toBeNull();
  });

  it('returns null when the policy is inactive', () => {
    expect(computeSla(ticket(), { ...POLICY, isActive: false })).toBeNull();
  });

  it('a fresh ticket at 0 minutes elapsed is ON_TRACK with a positive minutesToResponseDue', () => {
    const snap = computeSla(ticket(), POLICY, BASE_CREATED);
    expect(snap!.status).toBe('ON_TRACK');
    expect(snap!.minutesToResponseDue).toBeGreaterThan(0);
  });

  it('79% of the response target elapsed is ON_TRACK', () => {
    const now = new Date(BASE_CREATED.getTime() + 60 * 0.79 * 60_000);
    const snap = computeSla(ticket({ resolvedAt: null }), POLICY, now);
    expect(snap!.status).toBe('ON_TRACK');
  });

  it('80% of the response target elapsed is AT_RISK', () => {
    const now = new Date(BASE_CREATED.getTime() + 60 * 0.8 * 60_000);
    const snap = computeSla(ticket(), POLICY, now);
    expect(snap!.status).toBe('AT_RISK');
  });

  it('101% of the response target elapsed is BREACHED', () => {
    const now = new Date(BASE_CREATED.getTime() + 60 * 1.01 * 60_000);
    const snap = computeSla(ticket(), POLICY, now);
    expect(snap!.status).toBe('BREACHED');
  });

  it('both clocks stopped inside target is MET', () => {
    const respondedAt = new Date(BASE_CREATED.getTime() + 30 * 60_000);
    const resolvedAt = new Date(BASE_CREATED.getTime() + 120 * 60_000);
    const snap = computeSla(ticket({ firstRespondedAt: respondedAt, resolvedAt }), POLICY, new Date(BASE_CREATED.getTime() + 500 * 60_000));
    expect(snap!.status).toBe('MET');
  });

  it('response met but resolution breached is BREACHED — resolution outranks response', () => {
    const respondedAt = new Date(BASE_CREATED.getTime() + 10 * 60_000);
    const now = new Date(BASE_CREATED.getTime() + 300 * 60_000); // past resolution target, unresolved
    const snap = computeSla(ticket({ firstRespondedAt: respondedAt }), POLICY, now);
    expect(snap!.status).toBe('BREACHED');
  });

  it('response breached but resolution still ON_TRACK is BREACHED', () => {
    const now = new Date(BASE_CREATED.getTime() + 90 * 60_000); // past response target, well inside resolution target
    const snap = computeSla(ticket(), POLICY, now);
    expect(snap!.status).toBe('BREACHED');
  });

  it('a resolved ticket with a null firstRespondedAt is BREACHED for the response leg', () => {
    const resolvedAt = new Date(BASE_CREATED.getTime() + 10 * 60_000); // well inside every target
    const snap = computeSla(ticket({ resolvedAt }), POLICY, new Date(BASE_CREATED.getTime() + 20 * 60_000));
    expect(snap!.status).toBe('BREACHED');
  });

  it('responseDueAt and resolutionDueAt are derived from createdAt, not now', () => {
    const now = new Date(BASE_CREATED.getTime() + 1000 * 60_000);
    const snap = computeSla(ticket(), POLICY, now);
    expect(snap!.responseDueAt.getTime()).toBe(BASE_CREATED.getTime() + 60 * 60_000);
    expect(snap!.resolutionDueAt.getTime()).toBe(BASE_CREATED.getTime() + 240 * 60_000);
  });

  it('minutesToResponseDue is null once firstRespondedAt is set', () => {
    const respondedAt = new Date(BASE_CREATED.getTime() + 10 * 60_000);
    const snap = computeSla(ticket({ firstRespondedAt: respondedAt }), POLICY, new Date(BASE_CREATED.getTime() + 20 * 60_000));
    expect(snap!.minutesToResponseDue).toBeNull();
  });

  it('minutesToResponseDue is negative once the deadline has passed on a live clock', () => {
    const now = new Date(BASE_CREATED.getTime() + 90 * 60_000);
    const snap = computeSla(ticket(), POLICY, now);
    expect(snap!.minutesToResponseDue).toBeLessThan(0);
  });
});
