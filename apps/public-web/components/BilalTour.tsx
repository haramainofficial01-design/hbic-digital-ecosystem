"use client";
import { useEffect, useRef } from "react";
import { bilalTourSteps, translateUi, type LanguageCode } from "@hbic/shared";
import { MessageCircle, Link2, ShieldCheck, ArrowRight } from "lucide-react";
import styles from "./BilalCompanion.module.css";
import Image from "next/image";

export function BilalTour({ step, language, onNext, onSkip }: { step: number; language: LanguageCode; onNext(): void; onSkip(): void }) {
  const item = bilalTourSteps[step], t = (text: string) => translateUi(language, text), heading = useRef<HTMLHeadingElement>(null), Icon = step === 0 ? MessageCircle : step === 1 ? Link2 : ShieldCheck;
  useEffect(() => { heading.current?.focus(); }, [step]);
  return <div className={styles.tour} key={step}>
    {step === 0 ? <Image className={styles.tourMark} src="/brand/bilal-mark.svg" alt="" width={76} height={76} aria-hidden="true" /> : <span className={styles.tourMark} aria-hidden="true"><Icon size={35} strokeWidth={1.6} /></span>}
    <div className={styles.tourDots} aria-label={`${step + 1} / ${bilalTourSteps.length}`}>{bilalTourSteps.map((_, index) => <span key={index} data-active={step === index} />)}</div>
    <h3 ref={heading} tabIndex={-1}>{t(item.title)}</h3>
    <p>{t(item.body)}</p>
    <div className={styles.tourDetail}>{t(item.detail)}</div>
    <button className={styles.tourPrimary} onClick={onNext}>{t(step === 2 ? "Let’s begin" : "Next")}<ArrowRight size={18} aria-hidden="true" /></button>
    <button className={styles.tourSkip} onClick={onSkip}>{t("Skip tour")}</button>
  </div>;
}
