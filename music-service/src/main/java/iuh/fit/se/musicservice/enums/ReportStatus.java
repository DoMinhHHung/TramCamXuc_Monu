package iuh.fit.se.musicservice.enums;

public enum ReportStatus {
    PENDING,    // Chờ admin xem xét
    CONFIRMED,  // Admin xác nhận vi phạm → song bị soft-delete
    DISMISSED   // Admin bác bỏ báo cáo
}