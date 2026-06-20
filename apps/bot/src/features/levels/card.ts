// Rank/level kartı (@napi-rs/canvas) → PNG Buffer.
import { createCanvas, loadImage, type SKRSContext2D } from "@napi-rs/canvas";

const WIDTH = 900;
const HEIGHT = 280;

export interface RankCardOptions {
  avatarUrl: string;
  username: string;
  level: number;
  rank: number;
  currentXp: number; // level içindeki ilerleme
  neededXp: number; // bu level için gereken
  totalXp: number;
  accentColor?: string;
}

function roundRect(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function hexToCss(hex?: string): string {
  return hex && /^#?[0-9a-fA-F]{6}$/.test(hex)
    ? hex.startsWith("#") ? hex : `#${hex}`
    : "#5865F2";
}

export async function drawRankCard(opts: RankCardOptions): Promise<Buffer> {
  const accent = hexToCss(opts.accentColor);
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  // Arka plan
  ctx.fillStyle = "#1e1f26";
  roundRect(ctx, 0, 0, WIDTH, HEIGHT, 24);
  ctx.fill();
  ctx.fillStyle = "#2b2d31";
  roundRect(ctx, 20, 20, WIDTH - 40, HEIGHT - 40, 18);
  ctx.fill();

  // Avatar
  const aSize = 160;
  const aX = 50;
  const aY = HEIGHT / 2 - aSize / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(aX + aSize / 2, aY + aSize / 2, aSize / 2, 0, Math.PI * 2);
  ctx.clip();
  const avatar = await loadImage(opts.avatarUrl).catch(() => null);
  if (avatar) ctx.drawImage(avatar, aX, aY, aSize, aSize);
  else {
    ctx.fillStyle = "#3a3c42";
    ctx.fillRect(aX, aY, aSize, aSize);
  }
  ctx.restore();
  ctx.beginPath();
  ctx.arc(aX + aSize / 2, aY + aSize / 2, aSize / 2, 0, Math.PI * 2);
  ctx.lineWidth = 5;
  ctx.strokeStyle = accent;
  ctx.stroke();

  const textX = aX + aSize + 40;

  // Kullanıcı adı
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 40px sans-serif";
  ctx.fillText(opts.username.slice(0, 22), textX, 90);

  // Rank + Level (sağ üst)
  ctx.textAlign = "right";
  ctx.font = "bold 34px sans-serif";
  ctx.fillStyle = accent;
  ctx.fillText(`LEVEL ${opts.level}`, WIDTH - 50, 70);
  ctx.fillStyle = "#cfd2da";
  ctx.font = "26px sans-serif";
  ctx.fillText(`#${opts.rank}`, WIDTH - 50, 105);
  ctx.textAlign = "left";

  // XP bar
  const barX = textX;
  const barY = 150;
  const barW = WIDTH - barX - 50;
  const barH = 34;
  const ratio = opts.neededXp > 0 ? Math.min(1, opts.currentXp / opts.neededXp) : 0;

  ctx.fillStyle = "#1e1f26";
  roundRect(ctx, barX, barY, barW, barH, barH / 2);
  ctx.fill();
  if (ratio > 0) {
    ctx.fillStyle = accent;
    roundRect(ctx, barX, barY, Math.max(barH, barW * ratio), barH, barH / 2);
    ctx.fill();
  }

  // XP yazısı
  ctx.fillStyle = "#cfd2da";
  ctx.font = "22px sans-serif";
  ctx.fillText(`${opts.currentXp} / ${opts.neededXp} XP`, barX, barY + barH + 34);
  ctx.textAlign = "right";
  ctx.fillText(`Toplam: ${opts.totalXp} XP`, WIDTH - 50, barY + barH + 34);
  ctx.textAlign = "left";

  return canvas.toBuffer("image/png");
}
