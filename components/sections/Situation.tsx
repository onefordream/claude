const nodes = ["LESSON", "帰宅", "忘れる", "自己流で練習"];

export default function Situation() {
  return (
    <section className="section band-lightgray" id="situation">
      <div className="wrap">
        <p className="eyebrow justify-center">SITUATION</p>
        <h2 className="h2 center">
          そのままだと、
          <br />
          「教える時間」以外がつながりません。
        </h2>

        <div className="flow-diagram">
          {nodes.map((n) => (
            <div key={n} className="contents">
              <div className="flow-node">{n}</div>
              <span className="flow-arrow">→</span>
            </div>
          ))}
          <div className="flow-node" style={{ background: "var(--ink)", color: "#fff", borderColor: "var(--ink)" }}>
            NEXT LESSON
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-10 max-w-[640px] mx-auto">
          <div className="card p-5 text-[13.5px] leading-[1.85]">先生は毎回、前回の内容を思い出すところから。</div>
          <div className="card p-5 text-[13.5px] leading-[1.85]">生徒は毎回、「何を練習すればいい？」から始まる。</div>
        </div>
      </div>
    </section>
  );
}
