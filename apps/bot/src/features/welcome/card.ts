// Karşılama/uğurlama kartını @napi-rs/canvas ile çizer → PNG Buffer.
// canvacord yerine doğrudan canvas: tam kontrol, sürüm kırılganlığı yok.
import {
  createCanvas,
  loadImage,
  GlobalFonts,
  type SKRSContext2D,
  type Image,
} from "@napi-rs/canvas";

const WIDTH = 1024;
const HEIGHT = 320;

export interface CardOptions {
  avatarUrl: string;
  title: string; // placeholder'lar ÇÖZÜLMÜŞ gelmeli
  subtitle: string;
  backgroundUrl?: string | null;
  accentColor?: string; // hex
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, "$&$&") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Metni kart genişliğine sığacak şekilde kırp (taşmasın).
function fitText(ctx: SKRSContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + "…";
}

function drawBackground(
  ctx: SKRSContext2D,
  bg: Image | null,
  accent: [number, number, number],
) {
  if (bg) {
    // cover: oranı koruyarak doldur
    const scale = Math.max(WIDTH / bg.width, HEIGHT / bg.height);
    const w = bg.width * scale;
    const h = bg.height * scale;
    ctx.drawImage(bg, (WIDTH - w) / 2, (HEIGHT - h) / 2, w, h);
    ctx.fillStyle = "rgba(0,0,0,0.55)"; // okunabilirlik için karartma
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  } else {
    const grad = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    grad.addColorStop(0, "#1e1f26");
    grad.addColorStop(1, `rgb(${accent[0] * 0.4}, ${accent[1] * 0.4}, ${accent[2] * 0.4})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }
}

export async function drawWelcomeCard(opts: CardOptions): Promise<Buffer> {
  const accent = hexToRgb(opts.accentColor ?? "#5865F2");
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  // Arka plan
  const bg = opts.backgroundUrl
    ? await loadImage(opts.backgroundUrl).catch(() => null)
    : null;
  drawBackground(ctx, bg, accent);

  // Accent çerçeve
  ctx.strokeStyle = `rgb(${accent[0]}, ${accent[1]}, ${accent[2]})`;
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, WIDTH - 6, HEIGHT - 6);

  // Avatar (yuvarlak)
  const avatarSize = 180;
  const avatarX = 70;
  const avatarY = HEIGHT / 2 - avatarSize / 2;
  const cx = avatarX + avatarSize / 2;
  const cy = avatarY + avatarSize / 2;
  const r = avatarSize / 2;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  const avatar = await loadImage(opts.avatarUrl).catch(() => null);
  if (avatar) {
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
  } else {
    ctx.fillStyle = "#2b2d31";
    ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
  }
  ctx.restore();

  // Avatar çerçevesi
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.lineWidth = 6;
  ctx.strokeStyle = `rgb(${accent[0]}, ${accent[1]}, ${accent[2]})`;
  ctx.stroke();

  // Metin
  const textX = avatarX + avatarSize + 50;
  const maxTextWidth = WIDTH - textX - 50;

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 56px sans-serif";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(fitText(ctx, opts.title, maxTextWidth), textX, HEIGHT / 2 - 6);

  ctx.fillStyle = "#cfd2da";
  ctx.font = "34px sans-serif";
  ctx.fillText(fitText(ctx, opts.subtitle, maxTextWidth), textX, HEIGHT / 2 + 50);

  return canvas.toBuffer("image/png");
}

// Sistemde uygun font yoksa diye not: @napi-rs/canvas sistem fontlarını kullanır.
// İstenirse özel font GlobalFonts.registerFromPath(...) ile eklenebilir.
export { GlobalFonts };
