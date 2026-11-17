import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const maxFileSize = 100 * 1024;
const outputDirectory = new URL("../public/portfolio/", import.meta.url);

const images = [
  {
    url: "https://chacarasmorrogrande.com.br/og-image.jpg",
    fileName: "chacaras-morro-grande.webp",
  },
  {
    // Real capture of the live site (no social image used), 1200×630 like the others.
    capture: "https://nexbr.vercel.app/",
    fileName: "nexbr.webp",
  },
  {
    url: "https://doradoces.com.br/assets/brand/og-dora.png",
    fileName: "dora-doces.webp",
  },
];

async function toWebp(input) {
  for (let quality = 80; quality >= 40; quality -= 4) {
    const image = await sharp(input)
      .resize({ width: 1200 })
      .webp({ quality, effort: 6 })
      .toBuffer();

    if (image.length <= maxFileSize) return image;
  }

  throw new Error("A imagem não ficou abaixo de 100 KB sem reduzir demais a qualidade.");
}

async function download(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download retornou HTTP ${response.status}.`);
  return Buffer.from(await response.arrayBuffer());
}

async function capture(url) {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1200, height: 630 },
      deviceScaleFactor: 2,
    });
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(2500);
    return await page.screenshot({ type: "png" });
  } finally {
    await browser.close();
  }
}

await mkdir(outputDirectory, { recursive: true });

let failures = 0;
for (const image of images) {
  try {
    const output = await toWebp(
      image.capture ? await capture(image.capture) : await download(image.url),
    );
    await writeFile(new URL(image.fileName, outputDirectory), output);
    console.log(`${image.fileName}: ${(output.length / 1024).toFixed(1)} KB`);
  } catch (error) {
    failures += 1;
    console.error(`${image.fileName}: ${error.message}`);
  }
}

if (failures > 0) process.exitCode = 1;
