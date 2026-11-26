import { Composition, Folder } from "remotion";
import { CraftoryReel } from "./CraftoryReel";
import { reelSchema } from "./schema";

export const RemotionRoot: React.FC = () => {
  return (
    <Folder name="Instagram-Reels">
      <Composition
        id="CraftoryReel"
        component={CraftoryReel}
        schema={reelSchema}
        durationInFrames={450}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          brandName: "CRAFTORY",
          brandTagline: "Homepage Production",
          colors: {
            navy: "#0B1F44",
            blue: "#2563EB",
            pale: "#EEF3FF",
          },
          scene1: {
            label: "WEB PRODUCTION",
            title: "ホームページ制作",
            sites: [
              { name: "Cafe Lumiere", category: "飲食店", accent: "#C2410C", image: "" },
              { name: "Salon Aoi", category: "美容室", accent: "#BE185D", image: "" },
              { name: "Hikari Clinic", category: "クリニック", accent: "#0E7490", image: "" },
              { name: "Mori Koumuten", category: "工務店", accent: "#15803D", image: "" },
            ],
          },
          scene2: {
            label: "MONTHLY FEE",
            title: "月額費用なし",
            amount: "0",
            unit: "円",
          },
          scene3: {
            label: "PRICE",
            title: "制作費",
            price: 19800,
            suffix: "円〜",
          },
          scene4: {
            label: "SALES SYSTEM",
            line1: "売れる仕組みの",
            highlight: "売れる仕組み",
            line2: "ホームページで",
            chartTitle: "お問い合わせ数",
            notification: "新しいお問い合わせ",
          },
          scene5: {
            label: "GROWTH",
            line1: "事業を",
            line2: "拡大しませんか？",
          },
          scene6: {
            cta: "ご相談はプロフィールURLより",
            phoneButton: "お問い合わせ",
          },
        }}
      />
    </Folder>
  );
};
