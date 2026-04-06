export function openAdminRealtime(onMessage: () => void): () => void {
    if (typeof window === 'undefined') return () => undefined;

    const wsUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/api/ws/admin`;
    let socket: WebSocket | null = null;

    try {
        socket = new WebSocket(wsUrl);
        socket.onmessage = () => onMessage();
    } catch {
        return () => undefined;
    }

    return () => {
        if (!socket) return;
        try {
            socket.close();
        } catch {
            /* noop */
        }
    };
}
