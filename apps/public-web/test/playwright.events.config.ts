import { defineConfig } from "@playwright/test";
import base from "./playwright.quran.config";
export default defineConfig({...base,testMatch:"events-layout.spec.ts",outputDir:"../../../output/events-cleanup/test-results"});
