import { createContext, useContext, useState, ReactNode } from "react";
import type { InvestorEntity } from "@shared/schema";

interface EntityContextType {
  selectedEntity: InvestorEntity | null;
  setSelectedEntity: (entity: InvestorEntity | null) => void;
}

const EntityContext = createContext<EntityContextType | undefined>(undefined);

export function EntityProvider({ children }: { children: ReactNode }) {
  const [selectedEntity, setSelectedEntity] = useState<InvestorEntity | null>(null);

  return (
    <EntityContext.Provider value={{ selectedEntity, setSelectedEntity }}>
      {children}
    </EntityContext.Provider>
  );
}

export function useEntity() {
  const context = useContext(EntityContext);
  if (context === undefined) {
    throw new Error("useEntity must be used within an EntityProvider");
  }
  return context;
}
