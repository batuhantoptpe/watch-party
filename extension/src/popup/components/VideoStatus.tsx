export function VideoStatus({ videoDetected }: { videoDetected: boolean }) {
  return (
    <p className="video-status" data-detected={videoDetected}>
      <span className="status-dot" />
      {videoDetected ? "Bu sekmede video bulundu" : "Bu sekmede henüz video bulunamadı"}
    </p>
  );
}
