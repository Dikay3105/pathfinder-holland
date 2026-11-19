import { useLayoutEffect, useRef } from 'react';

interface AdviceViewProps {
  html: string;
  /** true khi AI đang viết dở: mục mới xuất hiện sẽ trượt nhẹ vào */
  streaming?: boolean;
}

/**
 * Hiển thị lời khuyên (HTML do BE dựng, đã escape).
 *
 * Khi stream, BE gửi lại toàn bộ HTML mỗi ~0.6s. Thay vì thay hết innerHTML (làm mọi mục nháy lại),
 * component so sánh theo data-k của từng mục trong .adv:
 *   - mục đã có  → chỉ cập nhật nội dung nếu khác (chữ chạy tiếp, không nháy)
 *   - mục mới    → chèn vào với hiệu ứng .adv-enter
 *   - mục bị bỏ  → xoá
 * Lời khuyên cũ (HTML tự do, không có .adv) thì gán thẳng.
 */
export function AdviceView({ html, streaming = false }: AdviceViewProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const host = ref.current;
    if (!host) return;

    const tpl = document.createElement('template');
    tpl.innerHTML = html || '';
    const next = tpl.content.firstElementChild as HTMLElement | null;
    const current = host.firstElementChild as HTMLElement | null;
    const structured = next?.classList.contains('adv');

    // Lần đầu / định dạng cũ / chuyển định dạng → gán thẳng
    if (!structured || !current?.classList.contains('adv')) {
      host.innerHTML = html || '';
      if (structured && streaming) {
        Array.from(host.firstElementChild!.children).forEach(c => c.classList.add('adv-enter'));
      }
      return;
    }

    const existing = new Map<string, Element>();
    Array.from(current.children).forEach(c => {
      const k = c.getAttribute('data-k');
      if (k) existing.set(k, c);
    });

    Array.from(next.children).forEach((incoming, i) => {
      const key = incoming.getAttribute('data-k');
      const old = key ? existing.get(key) : undefined;
      const anchor = current.children[i] || null;
      if (old) {
        if (old.innerHTML !== incoming.innerHTML) old.innerHTML = incoming.innerHTML;
        if (old !== anchor) current.insertBefore(old, anchor);
        existing.delete(key!);
      } else {
        incoming.classList.add('adv-enter');
        current.insertBefore(incoming, anchor);
      }
    });
    existing.forEach(el => el.remove());
  }, [html, streaming]);

  return <div ref={ref} className="advice-content" aria-live={streaming ? 'polite' : undefined} aria-busy={streaming || undefined} />;
}
