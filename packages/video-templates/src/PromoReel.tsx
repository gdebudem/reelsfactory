import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { ProductCard, ReelScript } from "@reels-factory/shared";

export type PromoReelProps = {
  product: ProductCard;
  script: ReelScript;
};

const FALLBACK_IMAGE =
  "https://placehold.co/600x800/312e81/ffffff/png?text=Reels+Factory";

export const PromoReel: React.FC<PromoReelProps> = ({ product, script }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const imageSrc = product.images?.[0] ?? FALLBACK_IMAGE;

  const zoom = interpolate(frame, [0, durationInFrames], [1, 1.08], {
    extrapolateRight: "clamp",
  });

  const headlineOpacity = spring({
    frame: frame - 10,
    fps,
    config: { damping: 200 },
  });

  const ctaStart = durationInFrames - fps * 3;

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(160deg, #0f172a 0%, #312e81 50%, #4c1d95 100%)",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          transform: `scale(${zoom})`,
        }}
      >
        <Img
          src={imageSrc}
          maxRetries={3}
          delayRenderTimeoutInMilliseconds={60_000}
          style={{
            maxWidth: "75%",
            maxHeight: "55%",
            objectFit: "contain",
            filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.4))",
          }}
        />
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          padding: 48,
          justifyContent: "flex-start",
        }}
      >
        <div
          style={{
            opacity: headlineOpacity,
            color: "white",
            fontSize: 52,
            fontWeight: 800,
            textTransform: "uppercase",
            lineHeight: 1.1,
            textShadow: "0 4px 24px rgba(0,0,0,0.5)",
          }}
        >
          {script.headline}
        </div>
        <div
          style={{
            opacity: headlineOpacity,
            color: "#c4b5fd",
            fontSize: 28,
            marginTop: 16,
            fontWeight: 600,
          }}
        >
          {script.subheadline}
        </div>
      </AbsoluteFill>

      {script.priceLabel && (
        <AbsoluteFill
          style={{
            justifyContent: "flex-end",
            alignItems: "flex-start",
            padding: 48,
            paddingBottom: 200,
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #f59e0b, #ef4444)",
              color: "white",
              padding: "16px 32px",
              borderRadius: 16,
              fontSize: 36,
              fontWeight: 800,
            }}
          >
            {script.priceLabel}
          </div>
        </AbsoluteFill>
      )}

      {frame >= ctaStart && (
        <AbsoluteFill
          style={{
            justifyContent: "flex-end",
            padding: 48,
            paddingBottom: 120,
          }}
        >
          <div
            style={{
              background: "white",
              color: "#312e81",
              padding: "20px 40px",
              borderRadius: 999,
              fontSize: 32,
              fontWeight: 700,
              textAlign: "center",
              width: "100%",
            }}
          >
            {script.ctaText}
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
