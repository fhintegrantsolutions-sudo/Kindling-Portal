"use client";

import { useTransition } from "react";
import { Select } from "@base-ui/react/select";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { setCurrentEntity } from "@/lib/entities/actions";
import { cn } from "@/lib/utils";

// Mirrors ALL_ENTITIES in @/lib/entities/context — that module is "server-only",
// so the literal is repeated here rather than imported into the client bundle.
const ALL = "all";
const ALL_LABEL = "All entities";

export type SwitcherEntity = { id: string; display_name: string };

export function EntitySwitcher({
  entities,
  currentEntityId,
  mode,
}: {
  entities: SwitcherEntity[];
  currentEntityId: string | null;
  mode: "all" | "one";
}) {
  const [pending, startTransition] = useTransition();

  // Single-entity logins (the overwhelming majority) get NO switcher UI at all.
  if (entities.length < 2) return null;

  const value = mode === "all" ? ALL : (currentEntityId ?? ALL);
  const items = [
    { value: ALL, label: ALL_LABEL },
    ...entities.map((e) => ({ value: e.id, label: e.display_name })),
  ];

  function handleChange(next: string | null) {
    if (!next || next === value) return;
    startTransition(async () => {
      await setCurrentEntity(next);
    });
  }

  return (
    <div className="px-4 pb-3">
      <Select.Root
        items={items}
        value={value}
        onValueChange={handleChange}
        disabled={pending}
      >
        <Select.Trigger
          aria-label="Current entity"
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-md border border-sidebar-border bg-transparent px-3 py-2 text-left text-sm text-sidebar-foreground transition-colors",
            "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
            "data-[popup-open]:bg-sidebar-accent",
            pending && "opacity-60",
          )}
        >
          <Select.Value className="truncate" />
          {pending ? (
            <Loader2 className="size-4 shrink-0 animate-spin opacity-70" />
          ) : (
            <Select.Icon>
              <ChevronsUpDown className="size-4 shrink-0 opacity-70" />
            </Select.Icon>
          )}
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner sideOffset={6} alignItemWithTrigger={false}>
            <Select.Popup className="z-50 max-h-72 min-w-[var(--anchor-width)] overflow-y-auto rounded-md border border-sidebar-border bg-sidebar p-1 text-sidebar-foreground shadow-lg outline-none">
              {items.map((item) => (
                <Select.Item
                  key={item.value}
                  value={item.value}
                  className="flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none data-[highlighted]:bg-sidebar-accent data-[highlighted]:text-sidebar-accent-foreground"
                >
                  {/* Fixed-width slot so labels stay aligned when no check
                      mark is rendered for unselected items. */}
                  <span className="flex size-4 shrink-0 items-center justify-center">
                    <Select.ItemIndicator>
                      <Check className="size-3.5" />
                    </Select.ItemIndicator>
                  </span>
                  <Select.ItemText className="truncate">
                    {item.label}
                  </Select.ItemText>
                </Select.Item>
              ))}
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}
