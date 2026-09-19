import type { ArgoConfig } from "./config.ts";

export function renderApplication(argocd: ArgoConfig): string {
  return `apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: ${argocd.appName}
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: ${argocd.project}
  source:
    repoURL: ${argocd.sourceRepo}
    targetRevision: ${argocd.targetRevision}
    path: ${argocd.sourcePath}
  destination:
    server: ${argocd.destinationServer}
    namespace: ${argocd.destinationNamespace}
  syncPolicy:
    automated:
      prune: ${argocd.autoPrune}
      selfHeal: ${argocd.selfHeal}
    syncOptions:
      - CreateNamespace=true
      - PruneLast=true
`;
}

export function renderArgoCli(argocd: ArgoConfig): string {
  return `# ArgoCD CLI cheat sheet (${argocd.appName})

argocd app get ${argocd.appName}
argocd app diff ${argocd.appName} --local environments/prod
argocd app sync ${argocd.appName} --prune
argocd app set ${argocd.appName} --sync-policy automated --auto-prune

Because PruneLast is set, resources removed from the gitops repo are cleaned up
only after the new state is healthy, so deliveries never delete first.
`;
}