/**
 * MSW Server Configuration
 * Setup dla Mock Service Worker w środowisku Node.js (testy)
 */

import { setupServer } from "msw/node";
import { handlers } from "./handlers";

// Setup serwera MSW z domyślnymi handlerami
export const server = setupServer(...handlers);
