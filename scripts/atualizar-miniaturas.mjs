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
    url: "https://q-cachos.pages.dev/assets/q-cachos-social-1200.jpg",
    fileName: "q-cachos.webp",
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

await mkdir(outputDirectory, { recursive: true });

let failures = 0;
for (const image of images) {
  try {
    const response = await fetch(image.url);
    if (!response.ok) throw new Error(`Download retornou HTTP ${response.status}.`);

    const output = await toWebp(Buffer.from(await response.arrayBuffer()));
    await writeFile(new URL(image.fileName, outputDirectory), output);
    console.log(`${image.fileName}: ${(output.length / 1024).toFixed(1)} KB`);
  } catch (error) {
    failures += 1;
    console.error(`${image.fileName}: ${error.message}`);
  }
}

if (failures > 0) process.exitCode = 1;
