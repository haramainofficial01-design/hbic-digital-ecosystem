export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { installServerBrotliContainment } = await import("./lib/serverBrotliContainment");
    const status = installServerBrotliContainment();
    console.info("HBIC_BROTLI_CONTAINMENT", JSON.stringify({ nodeVersion: process.versions.node, ...status }));
  }
}
