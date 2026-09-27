import { Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from "../../../components/ui/menu";
import { AREAS, AREA_META, type Project } from "../../projects/project-types";
import { PRIORITY_META, STATUS_META, TASK_PRIORITIES, TASK_STATUSES, type TaskPriority, type TaskStatus } from "../task-types";
import { PriorityIcon, ProjectSwatch, StatusIcon } from "./task-icons";

type PickerProps<T> = {
  value: T;
  onChange: (value: T) => void;
  /** The trigger element (rendered asChild). */
  children: ReactNode;
  align?: "start" | "center" | "end";
};

export function StatusMenu({ value, onChange, children, align }: PickerProps<TaskStatus>) {
  return (
    <Menu>
      <MenuTrigger asChild>{children}</MenuTrigger>
      <MenuContent align={align} onClick={(e) => e.stopPropagation()}>
        <MenuLabel>Trạng thái</MenuLabel>
        {TASK_STATUSES.map((s, i) => (
          <MenuItem
            key={s}
            icon={<StatusIcon status={s} />}
            hint={i + 1}
            selected={value === s}
            onSelect={() => onChange(s)}
          >
            {STATUS_META[s].label}
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}

export function PriorityMenu({ value, onChange, children, align }: PickerProps<TaskPriority>) {
  return (
    <Menu>
      <MenuTrigger asChild>{children}</MenuTrigger>
      <MenuContent align={align} onClick={(e) => e.stopPropagation()}>
        <MenuLabel>Ưu tiên</MenuLabel>
        {[...TASK_PRIORITIES].reverse().map((p) => (
          <MenuItem key={p} icon={<PriorityIcon priority={p} />} selected={value === p} onSelect={() => onChange(p)}>
            {PRIORITY_META[p].label}
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}

/** Projects grouped by area, Inbox first. */
export function ProjectMenu({
  value,
  onChange,
  children,
  align,
  projects,
}: PickerProps<string> & { projects: Project[] }) {
  const active = projects.filter((p) => !p.archived || p.id === value);
  return (
    <Menu>
      <MenuTrigger asChild>{children}</MenuTrigger>
      <MenuContent align={align} onClick={(e) => e.stopPropagation()}>
        <MenuItem icon={<Inbox size={14} className="text-ink-faint" />} selected={value === ""} onSelect={() => onChange("")}>
          Inbox
        </MenuItem>
        {AREAS.map((area) => {
          const list = active.filter((p) => p.area === area);
          if (!list.length) return null;
          return (
            <div key={area}>
              <MenuSeparator />
              <MenuLabel>{AREA_META[area].label}</MenuLabel>
              {list.map((p) => (
                <MenuItem
                  key={p.id}
                  icon={<ProjectSwatch color={p.color} />}
                  hint={<span className="font-mono">{p.key}</span>}
                  selected={value === p.id}
                  onSelect={() => onChange(p.id)}
                >
                  {p.name}
                </MenuItem>
              ))}
            </div>
          );
        })}
      </MenuContent>
    </Menu>
  );
}
