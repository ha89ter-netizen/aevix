import type { ComponentType } from "react";

export type EcosystemIconComponent = ComponentType<{ className?: string }>;

export type EcosystemNodeData = {
  id: string;
  icon: EcosystemIconComponent;
  before: string;
  after: string;
  beforeText: string;
  afterText: string;
};

export type EcosystemMode = "before" | "after";
