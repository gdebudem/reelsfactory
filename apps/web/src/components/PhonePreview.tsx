import Image from "next/image";
import type { ProductCard, ReelScript } from "@reels-factory/shared";

type Props = {
  product?: ProductCard;
  script?: ReelScript | null;
};

export function PhonePreview({ product, script }: Props) {
  return (
    <div className="relative mx-auto w-[280px]">
      <div className="rounded-[2.5rem] border-[10px] border-slate-900 bg-slate-900 p-2 shadow-2xl">
        <div className="relative aspect-[9/16] overflow-hidden rounded-[1.75rem] bg-gradient-to-b from-slate-900 via-indigo-950 to-violet-950">
          {product?.images[0] && (
            <div className="absolute inset-0 flex items-center justify-center pt-16">
              <Image
                src={product.images[0]}
                alt={product.title}
                width={200}
                height={240}
                className="max-h-[45%] w-auto object-contain drop-shadow-2xl"
                unoptimized
              />
            </div>
          )}
          <div className="absolute inset-x-0 top-8 px-4">
            <p className="text-lg font-extrabold uppercase leading-tight text-white drop-shadow-lg">
              {script?.headline ?? "Ваш слоган"}
            </p>
            <p className="mt-2 text-sm font-medium text-violet-200">
              {script?.subheadline ?? product?.title ?? "Подзаголовок"}
            </p>
          </div>
          {script?.priceLabel && (
            <div className="absolute bottom-28 left-4 rounded-xl bg-gradient-to-r from-amber-500 to-red-500 px-3 py-2 text-sm font-bold text-white">
              {script.priceLabel}
            </div>
          )}
          <div className="absolute inset-x-4 bottom-12 rounded-full bg-white py-3 text-center text-sm font-bold text-indigo-900">
            {script?.ctaText ?? "Перейти"}
          </div>
          <div className="absolute right-3 top-1/3 flex flex-col gap-4 text-white/80 text-xs">
            <span>♥</span>
            <span>💬</span>
            <span>↗</span>
          </div>
        </div>
      </div>
    </div>
  );
}
