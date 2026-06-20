// roles modülü — dışarıya açılan yüzey.
export { handleRoleButton } from "./handler.js";
export {
  publishPanel,
  deletePanel,
  PanelPublishError,
} from "./publish.js";
export {
  buildPanelMessage,
  buildCustomId,
  parseRoleCustomId,
  ROLE_BUTTON_PREFIX,
  type PanelEmbed,
} from "./render.js";
