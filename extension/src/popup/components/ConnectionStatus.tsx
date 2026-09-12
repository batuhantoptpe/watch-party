import type { ConnectionStatus as ConnectionStatusType, StatusSnapshot } from "../../shared-ext/runtimeMessages.js";

const LABELS: Record<ConnectionStatusType, string> = {
  disconnected: "Bağlı değil",
  connecting: "Bağlanıyor",
  connected: "Bağlı",
};

export function ConnectionStatus({ snapshot }: { snapshot: StatusSnapshot }) {
  return (
    <div className="status" data-state={snapshot.status}>
      <span className="status-dot" />
      {LABELS[snapshot.status]}
    </div>
  );
}
