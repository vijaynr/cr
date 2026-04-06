/**
 * Desktop bridge — minimal RPC client for Electrobun.
 *
 * In desktop mode the webapp talks to the bun main process over Electrobun's
 * WebSocket RPC transport instead of HTTP fetch.  This module provides a
 * drop-in `desktopFetch()` that mirrors the fetch API signature used by
 * `api.ts`, so callers only need one conditional at the transport boundary.
 *
 * Transport: WebSocket + AES-GCM encryption using preload-injected globals.
 */

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

/** Typed interface for Electrobun's preload-injected window globals. */
interface ElectrobunWindow {
  __electrobunWebviewId: number;
  __electrobunRpcSocketPort: number;
  __electrobun_encrypt: (msg: string) => Promise<{ encryptedData: string; iv: string; tag: string }>;
  __electrobun_decrypt: (encryptedData: string, iv: string, tag: string) => Promise<string>;
}

function electrobunWindow(): ElectrobunWindow {
  return window as unknown as ElectrobunWindow;
}

export function isDesktop(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof electrobunWindow().__electrobunWebviewId === "number"
  )
}

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let socket: WebSocket | null = null
let connected = false
let requestId = 0
const pending = new Map<
  number,
  {
    resolve: (value: { status: number; body: unknown }) => void
    reject: (reason: unknown) => void
  }
>()

// Re-export the encrypt/decrypt globals with short names
const encrypt = () => electrobunWindow().__electrobun_encrypt
const decrypt = () => electrobunWindow().__electrobun_decrypt

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------

/** Connect the WebSocket to the Electrobun RPC socket. Safe to call multiple times. */
export function initBridge(): Promise<void> {
  if (socket && connected) return Promise.resolve()
  if (socket) {
    // Already connecting
    return new Promise<void>((resolve, reject) => {
      socket?.addEventListener("open", () => resolve(), { once: true })
      socket?.addEventListener("error", () => reject(new Error("WebSocket error during init")), { once: true })
    })
  }

  const webviewId = electrobunWindow().__electrobunWebviewId
  const rpcPort = electrobunWindow().__electrobunRpcSocketPort

  return new Promise<void>((resolve, reject) => {
    const ws = new WebSocket(
      `ws://localhost:${rpcPort}/socket?webviewId=${webviewId}`,
    )
    socket = ws

    ws.addEventListener("open", () => {
      connected = true
      resolve()
    })

    ws.addEventListener("message", async (event) => {
      if (typeof event.data !== "string") return
      try {
        const packet = JSON.parse(event.data)
        const decrypted = await decrypt()(
          packet.encryptedData,
          packet.iv,
          packet.tag,
        )
        const msg = JSON.parse(decrypted)
        if (msg.type === "response" && pending.has(msg.id)) {
          const handlers = pending.get(msg.id)
          if (!handlers) return
          pending.delete(msg.id)
          if (msg.success) {
            handlers.resolve(msg.payload)
          } else {
            handlers.reject(new Error(msg.error ?? "RPC request failed"))
          }
        }
      } catch (err) {
        console.error("[desktop-bridge] Failed to parse message:", err)
      }
    })

    ws.addEventListener("error", (e) => {
      console.error("[desktop-bridge] WebSocket error:", e)
      reject(e)
    })

    ws.addEventListener("close", () => {
      connected = false
      socket = null
      // Reject all pending requests
      for (const [, { reject: rej }] of pending) {
        rej(new Error("WebSocket closed"))
      }
      pending.clear()
    })
  })
}

// ---------------------------------------------------------------------------
// RPC call
// ---------------------------------------------------------------------------

async function rpcRequest<T>(method: string, params: unknown): Promise<T> {
  if (!socket || !connected) await initBridge()
  const id = ++requestId
  const message = JSON.stringify({ type: "request", id, method, params })
  const encrypted = await encrypt()(message)
  socket?.send(JSON.stringify(encrypted))

  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      pending.delete(id)
      reject(new Error(`RPC request '${method}' timed out`))
    }, 30_000)

    pending.set(id, {
      resolve: (value) => {
        clearTimeout(timeout)
        resolve(value as T)
      },
      reject: (reason) => {
        clearTimeout(timeout)
        reject(reason)
      },
    })
  })
}

// ---------------------------------------------------------------------------
// Public API — drop-in replacement for fetch in api.ts
// ---------------------------------------------------------------------------

/**
 * Route an API call through Electrobun RPC instead of HTTP.
 * Returns a minimal Response-like object compatible with `fetchJson()`.
 */
export async function desktopFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const method = init?.method ?? "GET"
  let body: unknown 
  if (init?.body) {
    try {
      body = JSON.parse(init.body as string)
    } catch {
      body = init.body
    }
  }

  const result = await rpcRequest<{ status: number; body: unknown }>(
    "apiRequest",
    { method, path, body },
  )

  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: { "Content-Type": "application/json" },
  })
}
