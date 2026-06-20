// Metin şablonu placeholder'larını doldurur: {user} {username} {memberCount} {server}
export interface PlaceholderContext {
  userMention: string;
  username: string;
  memberCount: number;
  serverName: string;
}

export function applyPlaceholders(
  template: string,
  ctx: PlaceholderContext,
): string {
  return template
    .replaceAll("{user}", ctx.userMention)
    .replaceAll("{username}", ctx.username)
    .replaceAll("{memberCount}", String(ctx.memberCount))
    .replaceAll("{server}", ctx.serverName);
}
