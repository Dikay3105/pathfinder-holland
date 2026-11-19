import { useEffect, useLayoutEffect, useRef } from 'react';

interface AdviceViewProps {
  html: string;
  /** true khi AI đang viết dở → chữ được "gõ" ra từng ký tự kèm con trỏ */
  streaming?: boolean;
}

// Phần tử chỉ hiện khi con trỏ gõ tới (tránh hiện khung/dấu chấm rỗng trước khi có chữ)
const REVEAL_SELECTOR = 'li, tr, p, h3, h4, blockquote, .adv-card, .adv-major, .adv-chip, .adv-hrow, .adv-code, .adv-fit, .adv-asp-head';

type FullText = Text & { __full?: string };
type Tracked = HTMLElement & { __src?: string };

/** Ghi lại nội dung đầy đủ của mọi text node trong element (trước khi bị cắt bớt để gõ) */
function captureFullText(root: Node) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n: FullText | null;
  while ((n = walker.nextNode() as FullText | null)) n.__full = n.nodeValue || '';
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Hiển thị lời khuyên (HTML do BE dựng, đã escape).
 *
 * 1) Cập nhật cấu trúc: BE gửi lại toàn bộ HTML mỗi ~0.6s khi stream. Component so theo data-k của
 *    từng mục trong .adv: mục cũ chỉ cập nhật nội dung khi đổi, mục mới được chèn thêm (không vẽ lại cả trang).
 * 2) Gõ máy: mọi text node bị cắt còn `revealed` ký tự đầu (tính liên tục từ trên xuống), mỗi frame tăng
 *    thêm vài ký tự → chữ hiện ra như đang gõ, có con trỏ nhấp nháy ở cuối. Tốc độ tự tăng khi còn nhiều chữ
 *    chờ để không bị tụt lại so với AI. Lời khuyên đã có sẵn (không stream) thì hiện ngay toàn bộ.
 */
export function AdviceView({ html, streaming = false }: AdviceViewProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const typingRef = useRef(false);   // đang ở chế độ gõ (bắt đầu khi thấy streaming)
  const revealedRef = useRef(0);     // số ký tự đã hiện
  const rafRef = useRef<number>();
  const caretRef = useRef<HTMLSpanElement | null>(null);
  const streamingRef = useRef(streaming);
  const endSpeedRef = useRef<number | null>(null); // tốc độ cố định để gõ nốt sau khi AI viết xong
  streamingRef.current = streaming; // vòng lặp gõ đọc giá trị mới nhất (tránh closure cũ)

  if (streaming && !prefersReducedMotion()) typingRef.current = true;

  /* ---------- 1) Cập nhật cấu trúc ---------- */
  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    if (!html) {
      host.innerHTML = '';
      revealedRef.current = 0; // AI đổi model → xoá và gõ lại từ đầu
      return;
    }

    const tpl = document.createElement('template');
    tpl.innerHTML = html;
    const next = tpl.content.firstElementChild as HTMLElement | null;
    const current = host.firstElementChild as HTMLElement | null;
    const structured = !!next?.classList.contains('adv');

    if (!structured || !current?.classList.contains('adv')) {
      host.innerHTML = html;
      captureFullText(host);
      if (structured) Array.from(host.firstElementChild!.children).forEach(c => ((c as Tracked).__src = c.innerHTML));
    } else {
      const existing = new Map<string, Tracked>();
      Array.from(current.children).forEach(c => {
        const k = c.getAttribute('data-k');
        if (k) existing.set(k, c as Tracked);
      });
      Array.from(next.children).forEach((incoming, i) => {
        const key = incoming.getAttribute('data-k');
        const old = key ? existing.get(key) : undefined;
        const anchor = current.children[i] || null;
        if (old) {
          // so với HTML gốc đã lưu (DOM hiện tại có thể đang bị cắt chữ / có con trỏ)
          if (old.__src !== incoming.innerHTML) {
            old.innerHTML = incoming.innerHTML;
            old.__src = incoming.innerHTML;
            captureFullText(old);
          }
          if (old !== anchor) current.insertBefore(old, anchor);
          existing.delete(key!);
        } else {
          const el = incoming as Tracked;
          el.__src = incoming.innerHTML;
          captureFullText(el);
          current.insertBefore(el, anchor);
        }
      });
      existing.forEach(el => el.remove());
    }

    if (!typingRef.current) return; // hiện ngay toàn bộ
    applyReveal(); // cắt chữ ngay để không loé nội dung đầy đủ trước khi gõ
    startLoop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current!), []);



  /* ---------- 2) Gõ máy ---------- */

  /** Áp số ký tự đã gõ lên DOM; trả về tổng số ký tự */
  function applyReveal(): number {
    const host = hostRef.current;
    if (!host) return 0;
    const budget = revealedRef.current;

    caretRef.current?.remove();
    let cum = 0;
    let caretAfter: Text | null = null;
    const startOf = new Map<Node, number>();

    const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
    let n: FullText | null;
    while ((n = walker.nextNode() as FullText | null)) {
      const full = n.__full ?? n.nodeValue ?? '';
      startOf.set(n, cum);
      const show = Math.max(0, Math.min(full.length, budget - cum));
      const value = full.slice(0, show);
      if (n.nodeValue !== value) n.nodeValue = value;
      if (show > 0 && show <= full.length && full.trim()) caretAfter = n;
      cum += full.length;
    }

    // Ẩn phần tử chưa gõ tới (khung, dấu chấm đầu dòng, viền bảng...)
    host.querySelectorAll<HTMLElement>(REVEAL_SELECTOR).forEach(el => {
      const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let first: Node | null = tw.nextNode();
      while (first && !((first as FullText).__full ?? first.nodeValue ?? '').trim()) first = tw.nextNode();
      const start = first ? startOf.get(first) ?? 0 : Infinity;
      el.style.visibility = start < budget || (!first && budget >= cum) ? '' : 'hidden';
    });
    // Mục (section) chưa tới thì ẩn hẳn, khi tới thì trượt nhẹ vào
    const adv = host.querySelector('.adv');
    if (adv) {
      Array.from(adv.children).forEach(sec => {
        const tw = document.createTreeWalker(sec, NodeFilter.SHOW_TEXT);
        const first = tw.nextNode();
        const start = first ? startOf.get(first) ?? 0 : 0;
        const show = start < budget;
        const el = sec as HTMLElement;
        if (show && el.style.display === 'none') el.classList.add('adv-enter');
        el.style.display = show ? '' : 'none';
      });
    }

    // Con trỏ nhấp nháy sau chữ đang gõ
    if (budget < cum && caretAfter?.parentNode) {
      if (!caretRef.current) {
        caretRef.current = document.createElement('span');
        caretRef.current.className = 'adv-caret';
        caretRef.current.setAttribute('aria-hidden', 'true');
      }
      caretAfter.parentNode.insertBefore(caretRef.current, caretAfter.nextSibling);
    }
    return cum;
  }

  function startLoop() {
    if (rafRef.current) return;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(now - last, 100);
      last = now;
      const total = countTotal();
      const backlog = total - revealedRef.current;
      if (backlog > 0) {
        // ký tự/giây: ~120 khi theo kịp AI (nhìn rõ là đang gõ); AI viết nhanh hơn thì tăng tốc để không tụt quá ~3 giây.
        // AI đã xong → gõ nốt với tốc độ CỐ ĐỊNH, hết trong tối đa ~4 giây (không chậm dần ở cuối)
        let speed: number;
        if (streamingRef.current) {
          endSpeedRef.current = null;
          speed = Math.max(120, backlog / 3);
        } else {
          if (endSpeedRef.current === null) endSpeedRef.current = Math.max(120, backlog / 4);
          speed = endSpeedRef.current;
        }
        revealedRef.current = Math.min(total, revealedRef.current + (speed * dt) / 1000);
        applyReveal();
      }
      const finished = !streamingRef.current && revealedRef.current >= total;
      if (finished) {
        caretRef.current?.remove();
        typingRef.current = false;
        restoreAll();
        rafRef.current = undefined;
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  function countTotal(): number {
    const host = hostRef.current;
    if (!host) return 0;
    let cum = 0;
    const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
    let n: FullText | null;
    while ((n = walker.nextNode() as FullText | null)) cum += (n.__full ?? n.nodeValue ?? '').length;
    return cum;
  }

  /** Gõ xong: trả lại nội dung đầy đủ, bỏ mọi style tạm */
  function restoreAll() {
    const host = hostRef.current;
    if (!host) return;
    const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
    let n: FullText | null;
    while ((n = walker.nextNode() as FullText | null)) if (n.__full !== undefined) n.nodeValue = n.__full;
    host.querySelectorAll<HTMLElement>(REVEAL_SELECTOR).forEach(el => (el.style.visibility = ''));
    host.querySelectorAll<HTMLElement>('.adv > *').forEach(el => (el.style.display = ''));
  }

  // streaming vừa chuyển sang false (bản cuối đã về) → vòng lặp tự gõ nốt rồi dừng
  useEffect(() => {
    if (typingRef.current) startLoop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streaming]);

  return (
    <div
      ref={hostRef}
      className="advice-content"
      aria-live={streaming ? 'polite' : undefined}
      aria-busy={streaming || undefined}
    />
  );
}
