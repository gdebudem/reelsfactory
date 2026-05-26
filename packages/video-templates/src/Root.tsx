import { Composition, registerRoot } from "remotion";
import { PromoReel, type PromoReelProps } from "./PromoReel";

const RemotionRoot: React.FC = () => {
  const defaultProps: PromoReelProps = {
    product: {
      title: "Товар",
      price: 9990,
      currency: "RUB",
      images: ["https://placehold.co/600x800/png"],
      sourceUrl: "https://example.com",
    },
    script: {
      headline: "СУПЕРЦЕНА",
      subheadline: "Качество и надёжность",
      priceLabel: "9 990 ₽",
      ctaText: "Купить сейчас",
      templateId: "promo",
      scenes: [],
    },
  };

  return (
    <>
      <Composition
        id="PromoReel"
        component={PromoReel}
        durationInFrames={450}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={defaultProps}
      />
    </>
  );
};

registerRoot(RemotionRoot);

export { RemotionRoot };
