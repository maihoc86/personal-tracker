import { Button } from "../ui/button";
import { MOD_KEY } from "../../lib/keyboard";
import { Kbd } from "../ui/kbd";
import { Modal } from "../ui/modal";

type WelcomeModalProps = {
  open: boolean;
  onClose: () => void;
};

/** First-visit intro: what's here and the three keys worth learning. */
export function WelcomeModal({ open, onClose }: WelcomeModalProps) {
  return (
    <Modal open={open} title="Chào mừng đến không gian làm việc" onClose={onClose} size="sm">
      <div className="space-y-4 text-[13px] leading-relaxed text-ink-soft">
        <p>
          Việc công ty và việc nhà ở chung một chỗ: dự án chia theo <strong className="text-ink">Công việc</strong> và{" "}
          <strong className="text-ink">Cá nhân</strong>, trang <strong className="text-ink">Hôm nay</strong> gom việc gấp của cả hai. Mọi thứ lưu ngay trên trình duyệt này.
        </p>
        <ul className="space-y-2 rounded-[10px] border border-line p-3">
          <li className="flex items-center justify-between gap-3">
            <span>Ghi nhanh một việc</span>
            <Kbd>C</Kbd>
          </li>
          <li className="flex items-center justify-between gap-3">
            <span>Tìm bất cứ thứ gì, chạy lệnh</span>
            <span className="flex gap-1">
              <Kbd>{MOD_KEY}</Kbd>
              <Kbd>K</Kbd>
            </span>
          </li>
          <li className="flex items-center justify-between gap-3">
            <span>Gõ tắt trong tiêu đề</span>
            <span className="font-mono text-[11.5px] text-ink">#tag !cao @mai +MÃ ~2h</span>
          </li>
        </ul>
        <p>
          Đang có <strong className="text-ink">dữ liệu mẫu</strong> để bạn xem thử. Khi sẵn sàng, vào Cài đặt → Dữ liệu → Xoá toàn bộ để bắt đầu với không gian trống.
        </p>
        <div className="flex justify-end">
          <Button variant="primary" onClick={onClose}>
            Bắt đầu
          </Button>
        </div>
      </div>
    </Modal>
  );
}
