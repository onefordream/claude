export default function StickyCTA() {
  return (
    <div className="fixed bottom-0 inset-x-0 z-50 sm:hidden bg-white/90 backdrop-blur border-t border-line px-4 py-3 flex gap-2">
      <a href="#contact" className="btn-primary flex-1 !py-3 text-[14px]">
        デモを見てみる
      </a>
      <a
        href="#contact"
        className="btn-secondary flex-none !py-3 !px-4 text-[14px]"
      >
        相談する
      </a>
    </div>
  );
}
