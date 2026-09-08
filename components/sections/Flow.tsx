const steps = [
  { no: "01", title: "お問い合わせ", text: "まずはフォームからご連絡ください。" },
  { no: "02", title: "ヒアリング", text: "現在の指導方法・記録内容を伺います。" },
  { no: "03", title: "仕様・デザイン決定", text: "項目・機能・ロゴ・カラーを整理します。" },
  { no: "04", title: "専用環境を制作", text: "スクール専用の成長ノートを構築します。" },
  { no: "05", title: "確認", text: "実際の画面を確認しながら調整します。" },
  { no: "06", title: "利用開始", text: "生徒へ案内し、運用を開始します。" },
];

export default function Flow() {
  return (
    <section className="section band-lightgray">
      <div className="wrap">
        <p className="eyebrow justify-center">FLOW</p>
        <h2 className="h2 center">導入までの流れ</h2>

        <div className="flow-steps flex flex-col mt-13 max-w-[560px] mx-auto" style={{ marginTop: 52 }}>
          {steps.map((s) => (
            <div key={s.no} className="flow-step">
              <div className="flow-circle">{s.no}</div>
              <div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
