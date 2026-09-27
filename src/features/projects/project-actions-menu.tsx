import { Archive, Pencil, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { ui } from "../../components/shell/ui-store";
import { useConfirm } from "../../components/ui/confirm-dialog";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "../../components/ui/menu";
import { navigate } from "../../lib/router";
import { projectActions } from "./project-store";
import type { Project } from "./project-types";

/** Edit / archive / delete a project; `children` is the trigger. */
export function ProjectActionsMenu({
  project,
  children,
  side,
}: {
  project: Project;
  children: ReactNode;
  side?: "right" | "bottom";
}) {
  const confirm = useConfirm();

  async function handleDelete() {
    const ok = await confirm({
      title: `Xoá dự án "${project.name}"?`,
      message: "Task của dự án sẽ chuyển về Inbox, không bị xoá.",
      confirmLabel: "Xoá dự án",
      danger: true,
    });
    if (!ok) return;
    projectActions.remove(project.id);
    toast(`Đã xoá dự án ${project.name}, task đã chuyển về Inbox`);
    navigate({ name: "inbox" });
  }

  function toggleArchive() {
    projectActions.update(project.id, { archived: !project.archived });
    toast(project.archived ? `Đã bỏ lưu trữ ${project.name}` : `Đã lưu trữ ${project.name}`);
  }

  return (
    <Menu>
      <MenuTrigger asChild>{children}</MenuTrigger>
      <MenuContent align="start" side={side}>
        <MenuItem icon={<Pencil size={14} />} onSelect={() => ui.editProject(project.id)}>
          Sửa dự án
        </MenuItem>
        <MenuItem icon={<Archive size={14} />} onSelect={toggleArchive}>
          {project.archived ? "Bỏ lưu trữ" : "Lưu trữ"}
        </MenuItem>
        <MenuSeparator />
        <MenuItem danger icon={<Trash2 size={14} />} onSelect={handleDelete}>
          Xoá dự án
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}
