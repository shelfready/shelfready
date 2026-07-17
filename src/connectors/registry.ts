import type { Connector } from "./types";

const connectors = new Map<string, Connector>();

export function registerConnector(connector: Connector) {
  connectors.set(connector.type, connector);
}

export function getConnector(type: string): Connector {
  const connector = connectors.get(type);
  if (!connector) throw new Error(`no connector registered for type "${type}"`);
  return connector;
}
