import { Hero } from "@/components/landing/Hero";
import { Pipeline } from "@/components/landing/Pipeline";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Audience } from "@/components/landing/Audience";
import { Pricing } from "@/components/landing/Pricing";
import { Footer } from "@/components/landing/Footer";

export default function HomePage() {
  return (
    <div className="bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <Hero />
      <Pipeline />
      <HowItWorks />
      <Audience />
      <Pricing />
      <Footer />
    </div>
  );
}
