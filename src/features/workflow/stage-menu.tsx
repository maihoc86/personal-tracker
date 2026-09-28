import type { ReactNode } from "react";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger } from "../../components/ui/menu";
import { StatusIcon } from "../tasks/components/task-icons";
import type { Stage } from "./workflow-model";

/** Pick a stage of the task's workflow; `children` is the trigger. */
export function StageMenu({
  stages,
  value,
  onChange,
  children,
  align,
}: {
  stages: Stage[];
  value: string;
  onChange: (stageId: string) => void;
  children: ReactNode;
  align?: "start" | "center" | "end";
}) {
  return (
    <Menu>
      <MenuTrigger asChild>{children}</MenuTrigger>
      <MenuContent align={align} onClick={(e) => e.stopPropagation()}>
        <MenuLabel>Stage</MenuLabel>
        {stages.map((s, i) => (
          <MenuItem
            key={s.id}
            icon={<StatusIcon status={s.category} color={s.color} />}
            hint={i < 9 ? i + 1 : undefined}
            selected={value === s.id}
            onSelect={() => onChange(s.id)}
          >
            {s.name}
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}

export function StageIcon({ stage, size }: { stage: Stage; size?: number }) {
  return <StatusIcon status={stage.category} color={stage.color} size={size} />;
}
