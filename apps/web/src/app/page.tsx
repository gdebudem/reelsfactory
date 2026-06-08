import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";

export default function HomePage() {
  return (
    <div className="bg-slate-50">
      <Hero />
      <HowItWorks />
    </div>
  );
}
