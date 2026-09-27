import { AlertTriangle, X } from "lucide-react";
import { useEffect, useState } from "react";
import { STORAGE_FULL_EVENT } from "../../lib/persistence";
import { Tooltip } from "../ui/tooltip";

/**
 * Floating warning shown when a localStorage write fails because the quota is
 * full — so changes that silently stay in memory don't surprise the user on
 * reload. Dismissible; reappears if another write fails.
 */
export function StorageAlert() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onFull = () => setShow(true);
    window.addEventListener(STORAGE_FULL_EVENT, onFull);
    return () => window.removeEventListener(STORAGE_FULL_EVENT, onFull);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-[70] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-full bg-danger px-4 py-2.5 text-[13px] font-medium text-white">
      <AlertTriangle size={16} className="shrink-0" />
      <span>
        Bộ nhớ trình duyệt đã đầy — thay đổi mới có thể không được lưu. Hãy xuất sao lưu rồi
        dọn bớt dữ liệu trong Cài đặt.
      </span>
      <Tooltip label="Đóng">
        <button
          type="button"
          aria-label="Đóng"
          onClick={() => setShow(false)}
          className="grid h-6 w-6 shrink-0 place-items-center rounded-full transition-colors hover:bg-white/20"
        >
          <X size={15} />
        </button>
      </Tooltip>
    </div>
  );
}
