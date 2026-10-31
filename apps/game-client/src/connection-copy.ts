export function connectionReason(message: string): string {
  if (/[À-ỹ]/u.test(message)) return message;
  if (/not found|not exist/i.test(message))
    return 'Không tìm thấy phòng. Hãy kiểm tra mã phòng.';
  if (/full|maxClients|locked/i.test(message))
    return 'Phòng đã đầy hoặc tạm khóa.';
  if (/version|protocol/i.test(message))
    return 'Phiên bản game không tương thích. Hãy tải lại trang.';
  return 'Không thể kết nối tới server. Hãy kiểm tra kết nối và thử lại.';
}
