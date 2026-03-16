package iuh.fit.se.adsservice.enums;

public enum AdStatus {
    /** Đang chạy — eligible để phát cho user */
    ACTIVE,
    /** Admin tạm dừng hoặc hết budget */
    PAUSED,
    /** Chiến dịch kết thúc, không còn phát nữa */
    ARCHIVED
}
