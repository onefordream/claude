import Header from "@/components/Header";
import Footer from "@/components/Footer";
import StickyCTA from "@/components/StickyCTA";
import Hero from "@/components/sections/Hero";
import Problem from "@/components/sections/Problem";
import Situation from "@/components/sections/Situation";
import Concept from "@/components/sections/Concept";
import Solution from "@/components/sections/Solution";
import Benefit from "@/components/sections/Benefit";
import ProductFeatures from "@/components/sections/ProductFeatures";
import AICoach from "@/components/sections/AICoach";
import Customize from "@/components/sections/Customize";
import UseCase from "@/components/sections/UseCase";
import CaseStudy from "@/components/sections/CaseStudy";
import Price from "@/components/sections/Price";
import Flow from "@/components/sections/Flow";
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
        <Situation />
        <Concept />
        <Solution />
        <Benefit />
        <ProductFeatures />
        <AICoach />
        <Customize />
        <UseCase />
        <CaseStudy />
        <Price />
        <Flow />
        <FAQ />
        <FinalCTA />
        <Contact />
      </main>
      <Footer />
      <StickyCTA />
    </>
  );
}
