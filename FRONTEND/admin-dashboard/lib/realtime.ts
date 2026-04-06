export function openAdminRealtime(onMessage: () => void) {
    console.log("Admin realtime listening stub");
    return () => {
        console.log("Admin realtime closed stub");
    };
}
