import { createContext } from "preact";
import { useContext } from "preact/hooks";
import { Store } from "./types.ts";
import { EmitFn } from "../../adapter/hook.ts";

// Make sure we're accessing the right window object. The global window
// reference is not the same and won't trigger any "resize" (and likely
// other) events at all.
export const WindowCtx = createContext<Window>(null as any);
export const AppCtx = createContext<Store>(null as any);
export const EmitCtx = createContext<EmitFn>(() => null);

export const useEmitter = () => useContext(EmitCtx);
export const useStore = () => useContext(AppCtx);
