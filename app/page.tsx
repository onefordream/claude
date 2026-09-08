import Header from "@/components/Header";
import Footer from "@/components/Footer";
import StickyCTA from "@/components/StickyCTA";
import Hero from "@/components/sections/Hero";
import Problem from "@/components/sections/Problem";
import Solution from "@/components/sections/Solution";
import ProductUI from "@/components/sections/ProductUI";
import Benefit from "@/components/sections/Benefit";
import AICoach from "@/components/sections/AICoach";
import Customize from "@/components/sections/Customize";
import UseCase from "@/components/sections/UseCase";
import CaseStudy from "@/components/sections/CaseStudy";
import BeforeAfter from "@/components/sections/BeforeAfter";
import IntroFlow from "@/components/sections/IntroFlow";
import Price from "@/components/sections/Price";
import FAQ from "@/components/sections/FAQ";
import FinalCTA from "@/components/sections/FinalCTA";
import Contact from "@/components/sections/Contact";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Problem />
        <Solution />
        <ProductUI />
        <Benefit />
        <AICoach />
        <Customize />
        <UseCase />
        <CaseStudy />
        <BeforeAfter />
        <IntroFlow />
        <Price />
        <FAQ />
        <FinalCTA />
        <Contact />
      </main>
      <Footer />
      <StickyCTA />
    </>
  );
}
