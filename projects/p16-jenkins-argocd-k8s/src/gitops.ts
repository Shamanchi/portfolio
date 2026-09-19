export type SyncAction = "noop" | "sync" | "blocked";

export interface SyncDecision {
  outOfSync: boolean;
  action: SyncAction;
  reason: string;
}

export type DriftInput = {
  desiredTag: string;
  liveTag: string;
  desiredNamespace: string;
  liveNamespace: string;
};

export function syncDecision(input: DriftInput): SyncDecision {
  if (input.desiredNamespace !== input.liveNamespace) {
    return {
      outOfSync: true,
      action: "blocked",
      reason: `namespace drifted (desired ${input.desiredNamespace}, live ${input.liveNamespace})`,
    };
  }
  if (input.desiredTag === input.liveTag) {
    return { outOfSync: false, action: "noop", reason: "manifest matches the live deployment" };
  }
  return {
    outOfSync: true,
    action: "sync",
    reason: `image tag drifted (desired ${input.desiredTag}, live ${input.liveTag})`,
  };
}

export function describeSyncChain(loop: boolean, interval?: number): string {
  if (loop) {
    return "auto-sync watches the gitops repo continuously; a push triggers the re-render within seconds";
  }
  return `periodic sync every ${interval} minutes; disable loop mode and let ArgoCD reconcile on its schedule`;
}