"use client";
import { useEffect } from "react";
import { supportedLanguages, translateUi, type LanguageCode } from "@hbic/shared";

/** Translate reviewed interface strings for the app's embedded Academy flow.
 * Form values, Quran text and source content are never sent to a translator. */
export function InterfaceLanguage() {
  useEffect(() => {
    const queryLanguage = new URLSearchParams(location.search).get("lang");
    let selected = queryLanguage;
    try { selected ??= sessionStorage.getItem("hbic-interface-language"); } catch { /* Private browsing can disable storage. */ }
    const language = supportedLanguages.find(item => item.code === selected);
    if (!language) return;
    try { sessionStorage.setItem("hbic-interface-language", language.code); } catch { /* Query selection still works. */ }
    if (language.code === "en") return;
    const root = document.querySelector("main") ?? document.body;
    const previousLang = document.documentElement.lang, previousDir = document.documentElement.dir;
    const originalConfirm = window.confirm;
    window.confirm = message => originalConfirm.call(window, translateUi(language.code, message ?? ""));
    document.documentElement.lang = language.locale;
    root.setAttribute("dir", "rtl");
    const original = new WeakMap<Node, { source: string; translated: string }>();
    let frame = 0;
    function update() {
      frame = 0;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (node.parentElement?.closest("script,style,svg,textarea,[data-no-translate],.quran-arabic")) continue;
        const value = node.textContent ?? "", cached = original.get(node);
        if (cached?.translated === value) continue;
        const translated = translateUi(language!.code as LanguageCode, value);
        original.set(node, { source: value, translated });
        if (translated !== value) node.textContent = translated;
      }
      root.querySelectorAll<HTMLInputElement>("input[placeholder],textarea[placeholder]").forEach(input => {
        if (input.placeholder) input.placeholder = translateUi(language!.code as LanguageCode, input.placeholder);
      });
    }
    const observer = new MutationObserver(() => { if (!frame) frame = requestAnimationFrame(update); });
    observer.observe(root, { subtree: true, childList: true, characterData: true });
    update();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); window.confirm = originalConfirm; document.documentElement.lang = previousLang;
      document.documentElement.dir = previousDir; root.removeAttribute("dir"); };
  }, []);
  return null;
}
