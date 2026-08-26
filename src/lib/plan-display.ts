import type { Plan } from './types';

interface RuntimePreviewFlags {
  publicDemo: boolean;
  useMock: boolean;
}

export interface PlanActionLabelInput {
  approving: boolean;
  briefSignalsCount: number;
  infoOnly: boolean;
  needsDetail: boolean;
  previewOnly: boolean;
}

export function isPreviewOnlyPlan(plan: Plan, flags: RuntimePreviewFlags): boolean {
  return (
    flags.publicDemo ||
    flags.useMock ||
    plan.planId.startsWith('mock-') ||
    plan.checks.some(check => check.name === 'readOnlyPreview' && check.passed)
  );
}

export function planPrimaryActionLabel(plan: Plan, input: PlanActionLabelInput): string {
  if (input.needsDetail) return 'Add detail';
  if (input.approving) return input.previewOnly ? 'Previewing...' : 'Approving...';
  if (plan.planner?.route === 'portfolio_scan') return 'Review alerts';
  if (plan.planner?.route === 'find_money') return 'Preview savings scan';
  if (plan.planner?.route === 'market_pulse' || input.briefSignalsCount > 0) return 'Review brief';
  if (input.infoOnly) return 'Review watchlist';
  if (input.previewOnly) return 'Preview approval';
  return 'Approve & start';
}

export function planSuccessCopy(plan: Plan): { title: string; detail: string } {
  if (plan.planner?.route === 'portfolio_scan') {
    return { title: 'Alert preview ready', detail: 'No wallet scan or transaction was sent' };
  }

  if (plan.planner?.route === 'find_money') {
    return { title: 'Savings preview ready', detail: 'No bank account was connected' };
  }

  if (plan.planner?.route === 'market_pulse') {
    return { title: 'Market brief ready', detail: 'No transaction was sent' };
  }

  return { title: 'Preview approved', detail: 'No transaction was sent' };
}
